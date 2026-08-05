'use strict';

import Shell from 'gi://Shell';
import Meta from 'gi://Meta';
import GObject from 'gi://GObject';

import * as Log from './utils/log.js';
import {SettingsUtils} from './utils/settingsUtils.js';


// Singleton class, all methods are `static`
export class WindowTilingSupport {

    static initialize() {
        this._log = new Log.Log();
        this._settings = SettingsUtils.getSettings();
        this._defaultAppSystem = Shell.AppSystem.get_default();

        this._signals = new WindowTilingSupportSignals();

        // Used for getting another raised signal id to prevent 'too much recursion' due to raising each other.
        this._signalsConnectedMap = new Map();

        this._grabbedWindowsAboutToUntileMap = new Map();

        this._sizeChangedId = 0;
        this._sizeChangedWindow = null;

        global.display.connectObject(
            'grab-op-begin', this._grabOpBegin.bind(this),
            'grab-op-end', this._grabOpEnd.bind(this),
            this._signals);
    }

    static prepareToTile(metaWindow, window_tiling) {
        if (!window_tiling) return;
        if (!this._settings.get_boolean('restore-window-tiling')) return;
        const windowAboutToResize = this._getWindowAboutToResize(window_tiling);
        if (!windowAboutToResize) return;

        metaWindow._tile_match_yawsm = windowAboutToResize;
        windowAboutToResize._tile_match_yawsm = metaWindow;
        
        this._signals.emit('window-tiled', metaWindow, windowAboutToResize);

        // Connect `raised` only once and this will prevent `JS ERROR: too much recursion`
        if (!this._signalsConnectedMap.get(metaWindow)) {
            const raisedId = metaWindow.connect('raised', () => {
                const raisedTogether = this._settings.get_boolean('raise-windows-together');
                if (raisedTogether) {
                    const anotherWindowRaisedId = this._signalsConnectedMap.get(windowAboutToResize);
                    windowAboutToResize.block_signal_handler(anotherWindowRaisedId);
                    windowAboutToResize.raise();
                    windowAboutToResize.unblock_signal_handler(anotherWindowRaisedId);
                }
            });
            this._signalsConnectedMap.set(metaWindow, raisedId);
        }
    }

    static _grabOpBegin(display, grabbedWindow, grabOp) {
        // Fix `JS ERROR: TypeError: grabbedWindow is null` while `grab-op-begin` by `dash to panel`,
        // who emits nullish grabbedWindow.
        if (!grabbedWindow) return;

        // Check if the grabbed window has been in a tiling state with another window
        const windowAboutToResize = grabbedWindow._tile_match_yawsm;
        if (!windowAboutToResize || windowAboutToResize._tile_match_yawsm !== grabbedWindow) 
            return;
            
        // When position changed
        if (grabOp === Meta.GrabOp.MOVING) {
            const oldGrabbedWindowRect = grabbedWindow.get_frame_rect().copy();
            this._grabbedWindowsAboutToUntileMap.set(grabbedWindow, oldGrabbedWindowRect);
            return;
        }
        
        if (!this._settings.get_boolean('restore-window-tiling')) return;

        this._sizeChangedWindow = grabbedWindow;
        this._sizeChangedId = grabbedWindow.connect('size-changed', () => {
            const grabbedWindowRect = grabbedWindow.get_frame_rect();
            const windowAboutToResizeRect = windowAboutToResize.get_frame_rect();
            const grabbedWindowOnLeftSide = grabbedWindowRect.x < windowAboutToResizeRect.x;
            let xywh = null;
            if (grabbedWindowOnLeftSide) {
                xywh = [
                    grabbedWindowRect.width,
                    windowAboutToResizeRect.y,
                    windowAboutToResizeRect.width - (grabbedWindowRect.width - windowAboutToResizeRect.x),
                    windowAboutToResizeRect.height];
            } else {
                xywh = [
                    windowAboutToResizeRect.x,
                    windowAboutToResizeRect.y,
                    grabbedWindowRect.x,
                    windowAboutToResizeRect.height];
            }

            if (xywh) {
                windowAboutToResize.move_resize_frame(false, ...xywh);
            }

        });
    }

    static _grabOpEnd(display, grabbedWindow, grabOp) {
        // grabbedWindow is null, tested on Fedora 35 with Gnome 41.6 and Wayland,
        // by clicking the indicator show and then hide the popup menu
        if (!grabbedWindow) return;

        const oldGrabbedWindowRect = this._grabbedWindowsAboutToUntileMap.get(grabbedWindow);
        const currentRect = grabbedWindow.get_frame_rect();
        // Untile if any of x, y, width and height changed
        if (oldGrabbedWindowRect && 
            (oldGrabbedWindowRect.x !== currentRect.x 
            || oldGrabbedWindowRect.y !== currentRect.y
            || oldGrabbedWindowRect.width !== currentRect.width
            || oldGrabbedWindowRect.height !== currentRect.height)) 
        {
            const anotherTilingWindow = grabbedWindow._tile_match_yawsm;

            this._log.debug(`Untiling ${grabbedWindow.get_title()}`);
            delete grabbedWindow._tile_match_yawsm;

            if (anotherTilingWindow) {
                this._log.debug(`Untiling ${anotherTilingWindow.get_title()}`);
                delete anotherTilingWindow._tile_match_yawsm;
            }
            this._grabbedWindowsAboutToUntileMap.delete(grabbedWindow);

            this._disconnectRaisedSignals();

            this._signals.emit('window-untiled', grabbedWindow, anotherTilingWindow);
        }

        this._disconnectSizeChanged();
    }

    static _getWindowAboutToResize(window_tiling) {
        if (!window_tiling) return null; 
        const window_tile_for = window_tiling.window_tile_for;
        const shellApp = this._defaultAppSystem.lookup_app(window_tile_for.desktop_file_id);
        if (!shellApp) return null;
        const windows = shellApp.get_windows();
        if (!windows || !windows.length) return null;

        let windowAboutToResize = null;
        if (windows.length === 1) {
            windowAboutToResize = windows[0];
        } else {
            // Get one window by matching title
            for (const win of windows) {
                if (win.get_title() === window_tile_for.window_title) {
                    windowAboutToResize = win;
                    break;
                }
            }
        }

        return windowAboutToResize;
    }

    static connect(signal, func) {
        return this._signals.connect(signal, func);
    }

    static disconnect(id) {
        this._signals.disconnect(id);
    }

    static connectObject(...args) {
        this._signals.connectObject(...args);
    }

    static disconnectObject(obj) {
        this._signals.disconnectObject(obj);
    }

    static _disconnectRaisedSignals() {
        if (this._signalsConnectedMap) {
            this._signalsConnectedMap.forEach((id, obj) => {
                obj.disconnect(id);
            });
            this._signalsConnectedMap.clear();
        }
    }

    static _disconnectSizeChanged() {
        if (this._sizeChangedId && this._sizeChangedWindow) {
            this._sizeChangedWindow.disconnect(this._sizeChangedId);
        }
        this._sizeChangedId = 0;
        this._sizeChangedWindow = null;
    }

    static destroy() {

        if (this._grabbedWindowsAboutToUntileMap) {
            this._grabbedWindowsAboutToUntileMap.clear();
            this._grabbedWindowsAboutToUntileMap = null;
        }

        this._disconnectRaisedSignals();
        this._disconnectSizeChanged();

        this._signalsConnectedMap = null;

        global.display.disconnectObject(this._signals);

        this._signals = null;
    }


}

const WindowTilingSupportSignals = GObject.registerClass({
    Signals: {
        'window-tiled': {
            param_types: [Meta.Window.$gtype, Meta.Window.$gtype],
            flags: GObject.SignalFlags.RUN_LAST,
        },
        'window-untiled': {
            param_types: [Meta.Window.$gtype, Meta.Window.$gtype],
            flags: GObject.SignalFlags.RUN_LAST,
        },
    }
}, class WindowTilingSupportSignals extends GObject.Object{

    _init() {
        super._init();
    }


});
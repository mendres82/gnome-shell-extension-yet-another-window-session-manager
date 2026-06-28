'use strict';

import Meta from 'gi://Meta';
import Shell from 'gi://Shell';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import * as SaveSession from './saveSession.js';
import * as RestoreSession from './restoreSession.js';
import * as MoveSession from './moveSession.js';
import {sessionEndState} from './openWindowsTracker.js';
import * as Constants from './constants.js';
import * as Log from './utils/log.js';


const BINDINGS = [
    ['save-session-shortcut', '_onSaveSession'],
    ['restore-session-shortcut', '_onRestoreSession'],
    ['move-windows-shortcut', '_onMoveWindows'],
];


export class KeyboardShortcuts {

    constructor(settings) {
        this._settings = settings;
        this._log = new Log.Log();
        this._saveSession = new SaveSession.SaveSession(true);
        this._moveSession = new MoveSession.MoveSession();
    }

    enable() {
        const mode = Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW;
        const flags = Meta.KeyBindingFlags.IGNORE_AUTOREPEAT;

        for (const [name, handler] of BINDINGS) {
            Main.wm.addKeybinding(name, this._settings, flags, mode, () => this[handler]());
        }
    }

    disable() {
        for (const [name] of BINDINGS) {
            Main.wm.removeKeybinding(name);
        }
    }

    _autorestoreSessionName() {
        const sessionName = this._settings.get_string(Constants.PREFS_SETTING_AUTORESTORE_SESSIONS).trim();
        if (sessionName)
            return sessionName;

        global.notify_error(
            'Yet Another Window Session Manager',
            'No session selected for restore at startup. Enable restore at startup for a session in the panel menu first.'
        );
        return null;
    }

    _onSaveSession() {
        const sessionName = this._autorestoreSessionName();
        if (!sessionName)
            return;

        this._saveSession.saveSessionAsync(sessionName).catch(e => {
            const message = 'Failed to save session';
            this._log.error(e, e.desc ?? message);
            global.notify_error(
                'Yet Another Window Session Manager',
                `${message}. ${e.cause?.message ?? e.desc ?? message}`
            );
        });
    }

    _onRestoreSession() {
        const sessionName = this._autorestoreSessionName();
        if (!sessionName)
            return;

        sessionEndState.sessionClosedByUser = false;
        RestoreSession.restoreSessionObject.restoringApps = new Map();
        new RestoreSession.RestoreSession().restoreSession(sessionName);
    }

    _onMoveWindows() {
        const sessionName = this._autorestoreSessionName();
        if (!sessionName)
            return;

        this._moveSession.moveWindows(sessionName);
    }
}

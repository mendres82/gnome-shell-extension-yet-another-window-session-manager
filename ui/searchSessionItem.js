'use strict';

import GObject from 'gi://GObject';
import St from 'gi://St';
import Clutter from 'gi://Clutter';

import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import * as Tooltip from '../utils/tooltip.js';
import {PrefsUtils} from '../utils/prefsUtils.js';


export const SearchSessionItem = GObject.registerClass(
    class SearchSessionItem extends PopupMenu.PopupBaseMenuItem {

        _init() {
            super._init({
                activate: false,
                reactive: true,
                hover: false,
                can_focus: false
            });

            this._entry = new St.Entry({
                name: 'searchEntry',
                style_class: 'search-entry',
                can_focus: true,
                hint_text: _('Type to search'),
                track_hover: true,
                x_expand: false,
                y_expand: true,
                y_align: Clutter.ActorAlign.CENTER,
            });

            this._entry.set_primary_icon(new St.Icon({
                style_class: 'search-entry-icon',
                icon_name: 'edit-find-symbolic'
            }));

            this.add_child(this._entry);

            this._clearIcon = new St.Icon({
                style_class: 'search-entry-icon',
                icon_name: 'edit-clear-symbolic'
            });

            this._entry.set_secondary_icon(this._clearIcon);
            this._secondaryIconClickedId = this._entry.connect('secondary-icon-clicked', this.reset.bind(this));

            this._addFilters();
        }

        _addFilters() {
            const filterLabel = new St.Label({
                text: 'Filter: ',
                x_align: Clutter.ActorAlign.CENTER,
                y_align: Clutter.ActorAlign.CENTER,
            });
            this.add_child(filterLabel);
            this._filterAutoRestore();
            this._addPreferencesButton();
        }
        
        _filterAutoRestore() {
            this._filterAutoRestoreSwitch = new PopupMenu.Switch(false);
            let button = new St.Button({
                style_class: 'dnd-button',
                can_focus: true,
                x_align: Clutter.ActorAlign.END,
                y_align: Clutter.ActorAlign.CENTER,
                y_expand: true,
                toggle_mode: true,
                child: this._filterAutoRestoreSwitch,
            });
            this._filterAutoRestoreSwitch.bind_property('state',
                button, 'checked',
                GObject.BindingFlags.BIDIRECTIONAL | GObject.BindingFlags.SYNC_CREATE);

            new Tooltip.Tooltip({
                parent: button,
                markup: 'Show only the default session',
            });

            this.add_child(button);
        }

        _addPreferencesButton() {
            const icon = new St.Icon({
                icon_name: 'preferences-system-symbolic',
                style_class: 'search-entry-icon',
            });
            const button = new St.Button({
                style_class: 'search-preferences-button',
                can_focus: true,
                x_align: Clutter.ActorAlign.END,
                y_align: Clutter.ActorAlign.CENTER,
                y_expand: true,
                reactive: true,
                child: icon,
                track_hover: true,
            });

            new Tooltip.Tooltip({
                parent: button,
                markup: 'Open preferences',
            });

            button.connect('clicked', () => {
                PrefsUtils.extensionObject.openPreferences();
            });

            this.add_child(button);
        }

        reset() {
            this._entry.grab_key_focus();
            this._entry.set_text('');
            let text = this._entry.get_clutter_text();
            text.set_cursor_visible(true);
        }

        destroy() {
            if (this._secondaryIconClickedId) {
                this._entry.disconnect(this._secondaryIconClickedId);
                this._secondaryIconClickedId = null;
            }
        }
    });
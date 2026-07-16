'use strict';

import GObject from 'gi://GObject';

import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

import * as SessionItemButtons from '../ui/sessionItemButtons.js';


export const SessionItem = GObject.registerClass(
class SessionItem extends PopupMenu.PopupMenuItem {
    
    _init(fileInfo, file, indicator) {
        // Initialize this component, so we can use this.label etc
        super._init("");

        this._indicator = indicator;

        this._available = true;

        this._filepath = file.get_path();
        if(fileInfo != null) {
            this._filename = fileInfo.get_name(); 
            const modification_date_time = fileInfo.get_modification_date_time();
            if (modification_date_time) {
                this._modification_time = modification_date_time.to_local().format('%Y-%m-%d %T');
            } else {
                this._modification_time = _('(Unknown)');
                this._available = false;
            }
        } else {
            this._filename = file.get_basename();
            this._modification_time = _('(Please save this session before using it)');
            
            this._available = false;
        }

        this.label.set_x_expand(true);
        this.label.clutter_text.set_text(this._filename);

        this._sessionItemButtons = new SessionItemButtons.SessionItemButtons(this);
        this._sessionItemButtons.addButtons();

    }

    destroy() {
        this._sessionItemButtons?.destroy();
        this._sessionItemButtons = null;
        super.destroy();
    }

});


'use strict';

import GObject from 'gi://GObject';
import Gdk from 'gi://Gdk';
import Gtk from 'gi://Gtk';

import {gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';


const ShortcutRow = GObject.registerClass({
}, class ShortcutRow extends Gtk.ListBoxRow {

    _init({title, description, settingsKey, settings}) {
        super._init({focusable: true});

        this._settingsKey = settingsKey;
        this._settings = settings;
        this._capturing = false;

        const grid = new Gtk.Grid({
            margin_top: 12,
            margin_bottom: 12,
            margin_start: 12,
            margin_end: 12,
            row_spacing: 6,
            column_spacing: 32,
        });

        grid.attach(new Gtk.Label({
            hexpand: true,
            label: title,
            use_markup: true,
            xalign: 0,
        }), 0, 0, 1, 1);

        this._shortcutButton = new Gtk.Button({
            focusable: true,
            halign: Gtk.Align.END,
            valign: Gtk.Align.CENTER,
        });
        grid.attach(this._shortcutButton, 1, 0, 1, 2);

        const descriptionLabel = new Gtk.Label({
            hexpand: true,
            label: description,
            wrap: true,
            use_markup: true,
            xalign: 0,
        });
        descriptionLabel.get_style_context().add_class('dim-label');
        grid.attach(descriptionLabel, 0, 1, 1, 1);

        this.set_child(grid);

        const eventControllerKey = new Gtk.EventControllerKey();
        this._shortcutButton.add_controller(eventControllerKey);
        eventControllerKey.connect('key-pressed', this._onKeyPressed.bind(this));
        eventControllerKey.connect('key-released', this._onKeyReleased.bind(this));
        this._shortcutButton.connect('clicked', this._onShortcutButtonClicked.bind(this));
        this._settings.connect(`changed::${this._settingsKey}`, () => this._updateShortcutLabel());
        this._updateShortcutLabel();
    }

    _onShortcutButtonClicked() {
        this._capturing = true;
        this._shortcutButton.set_label(_('Press shortcut…'));
        this._shortcutButton.get_root().get_surface().inhibit_system_shortcuts(null);
        this._shortcutButton.grab_focus();
    }

    _finishCapturing() {
        if (!this._capturing)
            return;

        this._capturing = false;
        this._shortcutButton.get_root()?.get_surface()?.restore_system_shortcuts();
        this._updateShortcutLabel();
    }

    _onKeyReleased(_eventControllerKey, keyval, _keycode, state) {
        if (!this._capturing)
            return Gdk.EVENT_PROPAGATE;

        let mask = state & Gtk.accelerator_get_default_mod_mask();
        mask &= ~Gdk.ModifierType.LOCK_MASK;

        if (mask === 0 && keyval === Gdk.KEY_BackSpace) {
            this._settings.set_strv(this._settingsKey, []);
            this._finishCapturing();
            return Gdk.EVENT_STOP;
        }

        if (mask === 0 && keyval === Gdk.KEY_Escape) {
            this._finishCapturing();
            return Gdk.EVENT_STOP;
        }

        this._finishCapturing();
        return Gdk.EVENT_PROPAGATE;
    }

    _onKeyPressed(_eventControllerKey, keyval, _keycode, state) {
        if (!this._capturing)
            return Gdk.EVENT_PROPAGATE;

        let mask = state & Gtk.accelerator_get_default_mod_mask();
        mask &= ~Gdk.ModifierType.LOCK_MASK;

        if (mask === 0 && (keyval === Gdk.KEY_BackSpace || keyval === Gdk.KEY_Escape))
            return Gdk.EVENT_STOP;

        if (!Gtk.accelerator_valid(keyval, mask))
            return Gdk.EVENT_STOP;

        this._settings.set_strv(this._settingsKey, [Gtk.accelerator_name(keyval, mask)]);
        this._shortcutButton.set_label(Gtk.accelerator_get_label(keyval, mask));
        return Gdk.EVENT_STOP;
    }

    _updateShortcutLabel() {
        const shortcut = this._settings.get_strv(this._settingsKey)[0];
        if (!shortcut || shortcut === 'disabled') {
            this._shortcutButton.set_label(_('Disabled'));
            return;
        }

        const [ok, keyval, mask] = Gtk.accelerator_parse(shortcut);
        this._shortcutButton.set_label(
            ok ? Gtk.accelerator_get_label(keyval, mask) : shortcut
        );
    }
});

export function initShortcutRows(listBox, settings) {
    for (const [title, description, settingsKey] of [
        [_('Save Session'), _('Save open windows using the default session'), 'save-session-shortcut'],
        [_('Restore Session'), _('Restore windows from the default session'), 'restore-session-shortcut'],
        [_('Move Windows'), _('Move windows to their workspace and position by the default session'), 'move-windows-shortcut'],
    ]) {
        listBox.append(new ShortcutRow({title, description, settingsKey, settings}));
    }
}

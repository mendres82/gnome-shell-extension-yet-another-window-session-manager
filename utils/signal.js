import GObject from 'gi://GObject';


export const Signal = class {

    constructor() {

    }

    /**
     * Disconnect signal from an object without the below error / warning in `journalctl`:
     * 
     * ../gobject/gsignal.c:2732: instance '0x55629xxxxxx' has no handler with id '11000'
     *
     * Also tolerates instances already disposed by compositor/C code (e.g. MetaWindowActor).
     */
    disconnectSafely(obj, signalId) {
        if (!obj || !signalId) {
            return;
        }

        try {
            if (GObject.signal_handler_is_connected(obj, signalId))
                obj.disconnect(signalId);
        } catch (e) {
            // Object already disposed — nothing left to disconnect
        }
    }

}

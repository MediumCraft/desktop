import { Service, ViewHandler } from 'services/core';
import * as obs from '../../obs-api';

/*
Eventually this service will be in charge of storing and managing settings profiles
once the new persistant storage system is finalized. For now it just retrieves settings
from the backend.
*/

class SettingsManagerViews extends ViewHandler<{}> {
    get simpleStreamSettings() {
        return obs.SimpleStreamingFactory.legacySettings;
    }

    get advancedStreamSettings() {
        return obs.AdvancedStreamingFactory.legacySettings;
    }
}

export default class SettingsManagerService extends Service {
    get views() {
        return new SettingsManagerViews({});
    }
}

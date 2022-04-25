// this file will ensure that the migration step has been run prior to running the testing suite

import {Migrator} from '../data_access_layer/migrate';

describe('A Testing Suite', async () => {
    it('can be prepared', async () => {
        const migrator = new Migrator();
        return migrator.Run();
    });
});

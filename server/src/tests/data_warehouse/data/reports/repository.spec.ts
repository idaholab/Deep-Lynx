// import faker from 'faker';
// import {expect} from 'chai';
// import PostgresAdapter from '../../../../data_access_layer/mappers/db_adapters/postgres/postgres';
// import Logger from '../../../../services/logger';
// import ContainerMapper from '../../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
// import Container from '../../../../domain_objects/data_warehouse/ontology/container';
// import ReportRepository from '../../../../data_access_layer/repositories/data_warehouse/data/report_repository';
// import Report from '../../../../domain_objects/data_warehouse/data/report';
// import FileMapper from '../../../../data_access_layer/mappers/data_warehouse/data/file_mapper';
// import File from '../../../../domain_objects/data_warehouse/data/file';
// import DataSourceMapper from '../../../../data_access_layer/mappers/data_warehouse/import/data_source_mapper';
// import DataSourceRecord from '../../../../domain_objects/data_warehouse/import/data_source';
// import {User} from '../../../../domain_objects/access_management/user';
// import UserMapper from '../../../../data_access_layer/mappers/access_management/user_mapper';
// import Authorization from '../../../../domain_objects/access_management/authorization/authorization';

// describe('A Report Repository', async () => {
//     let containerID: string = process.env.TEST_CONTAINER_ID || '';
//     let dataSourceID = '';
//     let fileID = '';
//     let user: User;

//     before(async function () {
//         if (process.env.CORE_DB_CONNECTION_STRING === '') {
//             Logger.debug('skipping report tests, no mapper layer');
//             this.skip();
//         }
//         await PostgresAdapter.Instance.init();
//         const mapper = ContainerMapper.Instance;

//         const container = await mapper.Create(
//             'test suite',
//             new Container({
//                 name: faker.name.findName(),
//                 description: faker.random.alphaNumeric(),
//             }),
//         );

//         expect(container.isError).false;
//         expect(container.value.id).not.null;
//         containerID = container.value.id!;

//         const ds = await DataSourceMapper.Instance.Create(
//             'test suite',
//             new DataSourceRecord({
//                 container_id: containerID,
//                 name: 'Test Data Source',
//                 active: false,
//                 adapter_type: 'standard',
//                 data_format: 'json',
//             }),
//         );

//         expect(ds.isError).false;
//         expect(ds.value).not.empty;
//         dataSourceID = ds.value.id!;

//         const file = await FileMapper.Instance.Create(
//             'test suite',
//             new File({
//                 file_name: faker.name.findName(),
//                 file_size: 200,
//                 md5hash: '',
//                 adapter_file_path: faker.name.findName(),
//                 adapter: 'filesystem',
//                 data_source_id: dataSourceID,
//                 container_id: containerID,
//             }),
//         );

//         expect(file.isError).false;
//         expect(file.value).not.empty;
//         fileID = file.value.id!;

//         const userResult = await UserMapper.Instance.Create(
//             'test suite',
//             new User({
//                 identity_provider_id: faker.random.uuid(),
//                 identity_provider: 'username_password',
//                 admin: false,
//                 display_name: faker.name.findName(),
//                 email: faker.internet.email(),
//                 roles: ['superuser'],
//             }),
//         );

//         expect(userResult.isError).false;
//         expect(userResult.value).not.empty;
//         user = userResult.value;

//         return Promise.resolve();
//     });

//     after(async () => {
//         await UserMapper.Instance.Delete(user.id!);
//         await FileMapper.Instance.Delete(fileID);
//         await DataSourceMapper.Instance.Delete(dataSourceID);
//         await ContainerMapper.Instance.Delete(containerID);
//         return PostgresAdapter.Instance.close();
//     });

//     it('can save and update a Report', async () => {
//         const repository = new ReportRepository();
//         const report = new Report({
//             container_id: containerID,
//             status_message: faker.random.alphaNumeric()
//         });

//         let results = await repository.save(report, user);
//         expect(results.isError).false;
//         expect(report.id).not.undefined;

//         // now run an update
//         const updatedMessage = faker.random.alphaNumeric();
//         report.status_message = updatedMessage;

//         results = await repository.save(report, user);
//         expect(results.isError).false;
//         expect(report.id).not.undefined;
//         expect(report.status_message).eq(updatedMessage);

//         return repository.delete(report);
//     });

//     it('can delete a Report', async () => {
//         const repository = new ReportRepository();
//         const report = new Report({
//             container_id: containerID,
//             status_message: faker.random.alphaNumeric()
//         });

//         const results = await repository.save(report, user);
//         expect(results.isError).false;

//         const deleted = await repository.delete(report);
//         expect(deleted.isError).false;

//         return Promise.resolve();
//     });

//     it('can query, list, and count Reports', async () => {
//         const repository = new ReportRepository();
//         const report1 = new Report({
//             container_id: containerID,
//             status_message: faker.random.alphaNumeric()
//         });
//         const report2 = new Report({
//             container_id: containerID,
//             status_message: faker.random.alphaNumeric()
//         });

//         const save1 = await repository.save(report1, user);
//         const save2 = await repository.save(report2, user);
//         expect(save1.isError).false;
//         expect(save2.isError).false;

//         // simple query (test limit and offset)
//         let results = await repository.list({limit: 1, offset: 0});
//         expect(results.isError).false;
//         expect(results).not.empty;
//         expect(results.value.length).eq(1);

//         // test the where clause
//         results = await repository.where().statusMessage('eq', report1.status_message).findAll();
//         expect(results.isError).false;
//         expect(results).not.empty;
//         expect(results.value[0].status_message).eq(report1.status_message);

//         results = await repository.where().containerID('eq', containerID).findAll();
//         expect(results.isError).false;
//         expect(results).not.empty;
//         expect(results.value.length).eq(2);

//         // test count
//         const count = await repository.where().containerID('eq', containerID).count();
//         expect(count.isError).false;
//         expect(count.value).eq(2);

//         const delete1 = await repository.delete(report1);
//         const delete2 = await repository.delete(report2);
//         expect(delete1.isError).false;
//         expect(delete2.isError).false;

//         return Promise.resolve();
//     });

//     it('can retrieve report by ID', async () => {
//         const repository = new ReportRepository();
//         const report = new Report({
//             container_id: containerID,
//             status_message: faker.random.alphaNumeric()
//         });

//         const results = await repository.save(report, user);
//         expect(results.isError).false;
//         expect(report.id).not.undefined;

//         const retrieved = await repository.findByID(report.id!);
//         expect(retrieved.isError).false;
//         expect(retrieved.value.id).eq(report.id);

//         return repository.delete(report);
//     });

//     it('can set status in repo', async () => {
//         const repository = new ReportRepository();
//         const report = new Report({
//             container_id: containerID,
//             status_message: faker.random.alphaNumeric()
//         });

//         const results = await repository.save(report, user);
//         expect(results.isError).false;
//         expect(report.id).not.undefined;

//         const id = report.id!;
//         const message = faker.random.alphaNumeric();

//         const setStatus = await repository.setStatus(id, 'completed', message);
//         expect(setStatus.isError).false;

//         const retrieved = await repository.findByID(id);
//         expect(retrieved.isError).false;
//         expect(retrieved.value.id).eq(id);
//         expect(retrieved.value.status).eq('completed');
//         expect(retrieved.value.status_message).eq(message);

//         return repository.delete(report);
//     });

//     it('can add/remove a user to/from a Report', async () => {
//         const repository = new ReportRepository();
//         const report = new Report({
//             container_id: containerID,
//             status_message: faker.random.alphaNumeric()
//         });

//         const userResult = await UserMapper.Instance.Create(
//             'test suite',
//             new User({
//                 identity_provider_id: faker.random.uuid(),
//                 identity_provider: 'username_password',
//                 admin: false,
//                 display_name: faker.name.findName(),
//                 email: faker.internet.email(),
//                 roles: ['superuser'],
//             }),
//         );
//         expect(userResult.isError).false;
//         expect(userResult.value).not.empty;
//         const repUser = userResult.value;
        
//         const results = await repository.save(report, user);
//         expect(results.isError).false;
//         expect(report.id).not.undefined;

//         const e = await Authorization.enforcer();
//         let permissions = await e.getPermissionsForUser(repUser.id!);
//         let filtered = permissions.filter(set => 
//             (set[0] === repUser.id && set[1] === report.container_id && set[2] === `reports_${report.id}`)
//         );
//         expect(filtered.length).eq(0);

//         const userAdded = await repository.addUserToReport(report, repUser);
//         expect(userAdded.isError).false;

//         permissions = await e.getPermissionsForUser(repUser.id!);
//         filtered = permissions.filter(set => 
//             (set[0] === repUser.id && set[1] === report.container_id && set[2] === `reports_${report.id}`)
//         );
//         expect(filtered).not.empty;

//         const userRemoved = await repository.removeUserFromReport(report, repUser);
//         expect(userRemoved.isError).false;

//         permissions = await e.getPermissionsForUser(repUser.id!);
//         filtered = permissions.filter(set => 
//             (set[0] === repUser.id && set[1] === report.container_id && set[2] === `reports_${report.id}`)
//         );
//         expect(filtered.length).eq(0);

//         return UserMapper.Instance.Delete(repUser.id!);
//     });
// })
import {BucketRepository, LegacyTimeseriesColumn} from 'deeplynx';
import Config from '../config';

export default class TimeseriesService {
    private repo: BucketRepository;

    public static GetInstance(): Promise<TimeseriesService> {
        const instance = new TimeseriesService();
        return new Promise((resolve, reject) => {
            instance
                .init(Config.core_db_connection_string)
                .then(() => {
                    resolve(instance);
                })
                .catch((e) => {
                    reject(e);
                });
        });
    }

    init(dbConnection: string, maxColumns?: number): Promise<void> {
        return this.repo.init({dbConnectionString: dbConnection, maxColumns});
    }

    constructor() {
        this.repo = new BucketRepository();
    }

    beginLegacyCsvIngestion(dataSourceID: string, columns: LegacyTimeseriesColumn[]): void {
        return this.repo.beginLegacyCsvIngestion(dataSourceID, columns);
    }

    readData(bytes: Buffer): void {
        return this.repo.readData(bytes);
    }

    completeIngestion(): Promise<void> {
        return this.repo.completeIngestion();
    }
}

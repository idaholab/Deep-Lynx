import { BucketRepository, ChangeBucketPayload, Bucket } from "deeplynx-timeseries";
import Config from "../config";

export default class TimeseriesService {

    private static instance: TimeseriesService;
    private repo: BucketRepository;

    public static get Instance(): Promise<TimeseriesService> {
        if (!TimeseriesService.instance) {
            TimeseriesService.instance = new TimeseriesService();
            return new Promise((resolve, reject) => {
                TimeseriesService.instance.init(Config.core_db_connection_string)
                    .then(() => {
                        resolve(TimeseriesService.instance);
                    })
                    .catch(e => {
                        reject(e)
                    })
            })
        }

        return Promise.resolve(TimeseriesService.instance);
    }

    private init(dbConnection: string, maxColumns?: number): Promise<void> {
        return this.repo.init({dbConnectionString: dbConnection, maxColumns});
    }

    constructor() {
        this.repo = new BucketRepository();
    }

    createBucket(payload: ChangeBucketPayload): Promise<Bucket> {
        return this.repo.createBucket(payload);
    }

    retrieveBucket(bucketId: number): Promise<Bucket> {
        return this.repo.retrieveBucket(bucketId);
    }

    updateBucket(bucketId: number, payload: ChangeBucketPayload): Promise<Bucket> {
        return this.repo.updateBucket(bucketId, payload);
    }

    deleteBucket(bucketId: number): Promise<void> {
        return this.repo.deleteBucket(bucketId);
    }

    beginCsvIngestion(bucketId: number): Promise<void> {
        return this.repo.beginCsvIngestion(bucketId);
    }

    readData(bytes: Buffer): Promise<void> {
        return this.repo.readData(bytes);
    }

    completeIngestion(): Promise<void> {
        return this.repo.completeIngestion();
    }
}
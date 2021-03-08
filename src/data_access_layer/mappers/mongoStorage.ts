import Result from "../../result"
import Logger from "../../logger"
import {Collection, WriteConcernError, WriteError, ObjectID, MongoError} from "mongodb";
import {pipe} from "fp-ts/lib/pipeable";
import {Errors} from "io-ts";
import * as t from 'io-ts'
import {fold} from "fp-ts/lib/Either";
import {failure} from "io-ts/lib/PathReporter";

const notArchived = {"$not": {"$eq": true}};

// MongoStorage is a vestigial class. We're leaving it here in case we eventually create MongoDB export functionality
export default class MongoStorage {
    // Decode and Validate attempts to decode the input into the type requested by the user. If successful, a user
    // supplied function will run (usually calling whatever storage operation they originally wanted). On failure a
    // formatted error result will be returned instead.
    decodeAndValidate<T>(x: t.Type<any>, onSuccess:(r: (r:any) => void) => (x:T) => void, input:any ): Promise<Result<T>> {
        return new Promise((resolve) => {
            pipe(x.decode(input), fold(this.OnDecodeError(resolve), onSuccess(resolve)))
        })
    }

    create(item: any, collection: Collection, x: t.Type<any>): Promise<Result<any>> {
        return new Promise((resolve) => {
            collection.insertOne(item)
                .then((result) =>{
                    if(result.result.ok !== 1) {resolve(Result.Failure("unable to insert record into document database"))}
                    resolve(Result.Success(x.encode(result.ops[0])))
                } )
                .catch((err: WriteError | WriteConcernError) => {
                    resolve(Result.Failure(`unable to insert record into document database code: ${err.code} message: ${err.errmsg}`))
                })
        })
    }

    retrieve(id:string, collection: Collection, x: t.Type<any>): Promise<Result<any>> {
        return new Promise<Result<any>>((resolve) => {
            collection.findOne({"_id": new ObjectID(id), "archived": notArchived})
                .then((result) => {
                   if(result === null) resolve(Result.Failure("not found", 404));

                   resolve(Result.Success(x.encode(result)))
                })
                .catch((error: Error) => {Result.Failure(error.message)})
        })
    }

    list(filterOptions: {[key:string]: any}, collection: Collection, x: t.Type<any>): Promise<Result<any[]>> {
        filterOptions.archived = notArchived;

        return new Promise((resolve) => {
            collection.find(filterOptions).toArray()
                .then((result) => {
                    resolve(Result.Success(result.map(r => x.encode(r))))
                })
                .catch((err: MongoError) => {
                    resolve(Result.Failure(err.message))
                })
        })
    }

    update<T>(id:string, updatedFields: {[key:string]: any}, collection: Collection, x: t.Type<any>): Promise<Result<T>> {
        // sanity check - we don't want to update the main id  - we accept literally everything else and bank
        // on the fact that strict encoding means that no matter what fields they put in, they'll only ever
        // get the fields we decide are important out
       delete updatedFields._id;

       return new Promise((resolve) => {
           collection.findOneAndUpdate({"_id": new ObjectID(id), "archived":notArchived}, {"$set": updatedFields}, {
               upsert: true,
               returnOriginal: false
           })
               .then((result) => {
                   const record: T = result.value;

                   resolve(Result.Success(x.encode(record)))
                })
               .catch((err: MongoError) => resolve(Result.Failure(err.message)))
       })
    }

    permanentlyDelete(id: string, collection: Collection): Promise<Result<boolean>> {
       return new Promise((resolve) => {
          collection.deleteOne({"_id": new ObjectID(id)})
              .then((result) => {
                  resolve(Result.Success(true))
              })
              .catch((err: MongoError) => {
                  // Mongo will throw an error if a document doesn't exist, we don't want to give the user a way to
                  // check container existence, albeit a weird one. We're going to obscure the result.
                  Logger.error(`unable to delete mongo document ${err.errmsg}`);
                  resolve(Result.Success(true))
              })
       })
    }

    archive(id:string, collection: Collection): Promise<Result<boolean>> {
       return new Promise((resolve) => {
           collection.findOneAndUpdate({"_id": new ObjectID(id), "archived": notArchived}, {"$set": {archived: true}}, {
               upsert: true,
               returnOriginal: false
           })
               .then(() => {
                   resolve(Result.Success(true))
               })
               .catch((err: MongoError) => resolve(Result.Failure(err.message)))
       })
    }


    OnDecodeError(resolve:((check: any) => void) ): ((e: Errors ) => void) {
        return ((e) => {
            resolve(Result.Failure(`${failure(e)}`))
        })
    }
}



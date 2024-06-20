import {Readable} from 'stream';
import jwt from 'jsonwebtoken';
import Config from './config';
import UserRepository from '../data_access_layer/repositories/access_management/user_repository';
import { ContainerPermissionSet } from '../domain_objects/data_warehouse/ontology/container';
import Result from '../common_classes/result';
import { classToPlain } from 'class-transformer';

// toStream will recreate a read stream out of the supplied array of objects. This is generally used to prepare
// data to be sent to the Data Source interface's ReceiveData function. Users should avoid using this when possible
// and instead work with the data origin's stream (eg. http requests, file reads, conversion streams). However, we
// recognize there are instances in which we are sending so little data, or reading from a source with no stream
// implementations and so have provided this utility function.
export function toStream(data: any[]): Readable {
    const buffer = [...data]; // don't manipulate the underlying data array
    return new Readable({
        read() {
            if (buffer.length === 0) this.push(null);
            else this.push(buffer.shift());
        },
        objectMode: true,
    });
}

// This function is used to convert any string to be a valid GraphQL property or type name
// these names must match the regex expression /^[_a-zA-Z][_a-zA-Z0-9]*$/ in order to be
// considered valid. We attempt to convert a string by essentially applying an opposite
// regex matching and then removing or converting the results to a valid format - not ideal
// but we don't have a choice
export function stringToValidPropertyName(input: string): string {
    let output = input.replace(/[^_a-zA-Z0-9]+/g, '_');

    output = output.split(' ').join('_');

    const matches = /^[_a-zA-Z]/.exec(output);
    if (!matches || matches.length === 0) {
        output = `_${output}`;
    }

    return output;
}

// create a temp token to allow external apps to communicate with DL
// without having to store any credentials within the app
export async function newTempToken(containerID: string, userID: string, expiry?: string): Promise<Result<string>> {
    // create service user
    const userRepo = new UserRepository();
    const perms = new ContainerPermissionSet({data: ['write', 'read']});
    const user = await userRepo.createServiceUserWithPerms(containerID, userID, perms);
    if (user.isError) {return Promise.resolve(Result.Pass(user))}
    const serviceUser = user.value;

    const token = jwt.sign(classToPlain(serviceUser), Config.encryption_key_secret, {
        expiresIn: '',
        algorithm: 'RS256',
        allowInsecureKeySizes: true
    });

    return Promise.resolve(Result.Success(token));
}

export function dataTypeToParquetType(input: string): string {
    switch (input) {
        case 'number': {
            return 'INT32';
        }

        case 'number64': {
            return 'INT64';
        }

        case 'float': {
            return 'FLOAT';
        }

        case 'float64': {
            return 'DOUBLE';
        }

        case 'date': {
            return 'TIMESTAMP_MILLIS';
        }

        case 'boolean': {
            return 'BOOLEAN';
        }

        case 'list': {
            return 'JSON';
        }

        default: {
            return 'UTF8';
        }
    }
}

export function valueCompare(operator: string, v1: any, v2: any): boolean {
    switch (operator) {
        case 'eq': {
            return v1 === v2;
        }
        case '==': {
            return v1 === v2;
        }
        case 'neq': {
            return v1 !== v2;
        }
        case '!=': {
            return v1 !== v2;
        }
        case '<>': {
            return v1 !== v2;
        }
        case '<': {
            return v1 < v2;
        }
        case '>': {
            return v1 > v2;
        }
        case '<=': {
            return v1 <= v2;
        }
        case '>=': {
            return v1 >= v2;
        }
        case 'like': {
            return v1.includes(v2);
        }
        case 'in': {
            if (Array.isArray(v2)) {
                return v2.includes(v1);
            }
        }
    }

    return false;
}

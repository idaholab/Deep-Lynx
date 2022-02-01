import Logger from '../services/logger';
import express from 'express';
import {serialize} from 'class-transformer';

/*
 Result was created to solve the problem of constantly throwing and catching
 errors in the node.js promise ecosystem. Instead of throwing an error, we
 prefer that the user return an instance of the Result class, whose values
 and methods reflect success/failure and any success/failure values.
*/
export default class Result<TSuccess> {
    value: TSuccess;
    error?: Error;
    isError: boolean;

    public static Success<T>(success: T) {
        return new Result<T>(success, false);
    }

    // this method also logs an error in order to facilitate fast,easy logging
    public static Failure(error: string, errorCode?: number, value?: any) {
        return new Result<any>(value, true, new Error(error, errorCode));
    }

    public static SilentFailure(error: string, errorCode?: number) {
        return new Result<any>(null, true, new Error(error, errorCode));
    }

    public static Error(e: Error) {
        return new Result<any>(null, true, e);
    }

    // calling this allows the user to pass a Result class - this is done to avoid
    // compilation errors when the return type of a Result's value doesn't match
    // the parent operation's type.
    public static Pass(res: Result<any>) {
        return res;
    }

    // this is a helper method that allows use to utilize the class-transformer
    // when working with express.js returns
    public asResponse(resp: express.Response, code?: number) {
        if (this.isError) {
            resp.status(this.error?.errorCode ? this.error.errorCode : 500);
        } else if (code) {
            resp.status(code);
        } else {
            resp.status(200);
        }

        resp.setHeader('Content-Type', 'application/json');
        resp.send(serialize(this));
    }

    constructor(value: TSuccess, isError: boolean, error?: Error) {
        this.value = value;
        this.isError = isError;
        if (error) this.error = error;
    }
}

class Error {
    error: string;
    errorCode = 500;

    constructor(error: string, errorCode?: number) {
        this.error = error;
        if (errorCode) this.errorCode = errorCode;
    }
}

/*
 Pre-built error classes might come in handy in a few situations. Consider adding
 your own error if you find yourself typing the same thing over and over.
*/
export const ErrorNotFound = new Error('resource not found', 404);
export const ErrorUnauthorized = new Error('unauthorized', 401);

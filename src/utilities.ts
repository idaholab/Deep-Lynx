import {Errors} from "io-ts";
import Result from "./result";
import {failure} from "io-ts/lib/PathReporter";

// This is a collection of functions that have proved useful across the application.
export function onDecodeError(resolve:((check: any) => void) ): ((e: Errors ) => void) {
    return ((e) => {
        resolve(Result.Failure(`${failure(e)}`))
    })
}

export function getNestedValue(key:string, payload: {[key:string]: any}): any {
    if(key.split(".").length > 1) {
        const keys = key.split(".")
        const parent = keys.shift()

        return getNestedValue(keys.join("."), payload[parent!])
    }

    return payload[key]
}

import {Errors, ValidationError} from "io-ts";
import Result from "./result";
const crypto = require('crypto')
const flatten = require('flat');

// This is a collection of functions that have proved useful across the application.
export function onDecodeError(resolve:((check: any) => void) ): ((e: Errors ) => void) {
    return ((e: ValidationError[]) => {
        const errorStrings: string[] = []
        for(const error of e) {
            const last = error.context[error.context.length - 1]

            errorStrings.push(`Invalid Value '${error.value}' supplied for field '${last.key}'`)
        }

        resolve(Result.Failure(errorStrings.join(",")))
    })
}

// getNestedValue will return any value specified by the "key" in a given payload
// you can also retrieve a value from an array by using the dot notation followed
// by an array symbol [], and passing in an array of numbers to indicate the index
// of the array to fetch
export function getNestedValue(key:string, payload: any, index?: number[]): any {
    const copiedIndex = (index) ? [...index] : undefined
    if(key.split(".").length > 1) {
        const keys = key.split(".")
        const parent = keys.shift()

        if(Array.isArray(payload)) {
            const currentIndex = copiedIndex?.shift()

            return getNestedValue(keys.join("."), payload[currentIndex!], copiedIndex)
        }

        return getNestedValue(keys.join("."), payload[parent!], copiedIndex)
    }

    return payload[key]
}

// creates a base64 encoded hash of an object's shape. An object shape is a combination
// of its keys and the type of data those keys are in
export function objectToShapeHash(obj: any) {
    const keyTypes: string[] = []
    // safe means that the flattened object will maintain arrays as they are,
    // not attempt to flatten them along with the rest of the object
    const flattened = flatten(obj, {safe : true})

    extractPropsAndTypes(flattened, keyTypes)

    return crypto.createHash("sha256").update(keyTypes.sort().join("")).digest("base64");
}

// reminder that arrays are pass by reference, we can push to array in this function
// and have it affect the final product
export function extractPropsAndTypes(obj: any, resultArray: string[]) {
    for(const key of Object.keys(obj)) {
        if(Array.isArray(obj[key]) && obj[key].length > 0) {
            if(typeof obj[key][0] === 'object'  && obj[key][0] !== null) {
                extractPropsAndTypes(obj[key][0], resultArray)
            }
        }

        resultArray.push(key+`:${typeof obj[key]}`)
    }
}


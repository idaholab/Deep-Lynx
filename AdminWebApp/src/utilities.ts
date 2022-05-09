// this function is fully tested inside the main Deep Lynx repository. I've only
// pulled it out into this file for ease of use when importing the function from
// inside the UI.
export function getNestedValue(key: string, payload: any, index?: number[]): any {
    // @ts-ignore
    const copiedIndex = index ? [...index] : undefined;
    if (key.split('.').length > 1) {
        const keys = key.split('.');
        const parent = keys.shift();

        if (Array.isArray(payload)) {
            const currentIndex = copiedIndex?.shift();

            return getNestedValue(keys.join('.'), payload[currentIndex!], copiedIndex);
        }

        return getNestedValue(keys.join('.'), payload[parent!], copiedIndex);
    }

    return payload[key];
}

// This function is used to convert any string to be a valid GraphQL property or type name
// these names must match the regex expression /^[_a-zA-Z][_a-zA-Z0-9]*$/ in order to be
// considered valid. We attempt to convert a string by essentially applying an opposite
// regex matching and then removing or converting the results to a valid format - not ideal
// but we don't have a choice
export function stringToValidPropertyName(input: string): string {
    let output = input.replace(/[^_a-zA-Z0-9]/, '_');

    output = output.split(' ').join('_');

    const matches = /^[_a-zA-Z]/.exec(output);
    if (!matches || matches.length === 0) {
        output = `_${output}`;
    }

    return output;
}

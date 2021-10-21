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

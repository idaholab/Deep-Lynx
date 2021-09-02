import {Readable} from 'stream';

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

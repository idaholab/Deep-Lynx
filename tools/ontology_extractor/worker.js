const http = require('http');
var workerpool = require('workerpool');

function apiCall(hostname, port, path, data) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: hostname,
            port: port,
            path: path,
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Content-Length': data.length
            },
            timeout: 2000
        }

        const req = http.request(options, res => {
            let chunks_of_data = [];
        
            res.on('data', d => {
                chunks_of_data.push(d)
            })

            res.on('end', () => {
				let response_body = Buffer.concat(chunks_of_data);
				resolve(response_body.toString());
			});
        })
        req.on('error', error => {
            console.error(error)
            reject(error)
        })

        req.write(data);
        req.end();
    });
}

workerpool.worker({
  apiCall: apiCall
});
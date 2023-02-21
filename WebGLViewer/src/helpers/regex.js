const data_ext = /^[^.]+.data$/;
const wasm_ext = /^[^.]+.wasm$/;
const framework_ext = /^[^.]+.framework.js$/;
const loader_ext = /^[^.]+.loader.js$/;

function regex(arr) {
  // This function takes an array of files, and uses regex to organize them by file extension, returning an object:
  //   {
  //     data: { id: '1', container_id: '1', file_name: 'WebGL.data' },
  //     loader: { id: '2', container_id: '1', file_name: 'WebGL.loader.js' },
  //     framework: { id: '3', container_id: '1', file_name: 'WebGL.framework.js' },
  //     wasm: { id: '4', container_id: '1', file_name: 'WebGL.wasm' }
  //   }

  let results = {};

  for (let obj of arr) {
    for (let [key, value] of Object.entries(obj)) {
      if (key === 'file_name') {
        if (data_ext.test(value) === true) {
          results.data = {
            id: obj.file_id,
            container: obj.container_id,
            file_name: value,
          };
        }

        if (wasm_ext.test(value) === true) {
          results.wasm = {
            id: obj.file_id,
            container: obj.container_id,
            file_name: value,
          };
        }
        if (framework_ext.test(value) === true) {
          results.framework = {
            id: obj.file_id,
            container: obj.container_id,
            file_name: value,
          };
        }
        if (loader_ext.test(value) === true) {
          results.loader = {
            id: obj.file_id,
            container: obj.container_id,
            file_name: value,
          };
        }
      }
    }
  }

  console.log(results);

  return results;
}

export default regex;

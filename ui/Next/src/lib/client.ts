// Model Viewer

const base = process.env.DEEPLYNX_BASE;
const token = process.env.NEXT_PUBLIC_TOKEN;

export const uploadFile = async (
  file: File,
  containerId: string,
  dataSourceId: string
) => {
  const form: FormData = new FormData();
  form.append("file", file);

  const response = await fetch(
    `${base}/containers/${containerId}/import/datasources/${dataSourceId}/files`,
    {
      method: "POST",
      headers: {
        Authorization: `bearer ${token}`,
        "Content-Type": "multipart/form-data",
      },
      body: form,
    }
  ).then(async (response) => {
    if (!response.ok) {
      throw new Error(response.status.toString());
    }

    const data = await response.json();
    return data;
  });

  return response;
};

export const fetchFiles = async (containerId: string) => {
  const response = await fetch(`${base}/containers/${containerId}/files`, {
    method: "GET",
    headers: {
      Authorization: `bearer ${token}`,
    },
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error(response.status.toString());
    }

    const data = await response.json();
    return data;
  });

  return response.value;
};

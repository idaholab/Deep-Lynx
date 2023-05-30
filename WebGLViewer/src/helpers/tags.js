export default function ParseTag(obj) {
  let tag;

  for (let [file, metadata] of Object.entries(obj)) {
    Object.entries(metadata).forEach((entry) => {
      if (entry[0] == 'tag_name') tag = entry[1];
    });
  }

  return tag;
}

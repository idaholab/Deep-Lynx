export default function regexTag(obj) {
  let tag = [];

  for (let [file, metadata] of Object.entries(obj)) {
    Object.entries(metadata).forEach((entry) => {
      if (entry[0] == 'tag_name') tag.push(entry[1]);
    });
  }

  return [...new Set(tag)];
}

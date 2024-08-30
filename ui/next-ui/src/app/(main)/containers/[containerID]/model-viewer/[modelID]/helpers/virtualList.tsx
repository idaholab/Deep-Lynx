// MUI
import { ListItem, ListItemButton, ListItemText } from "@mui/material";

import { ListChildComponentProps } from "react-window";

// Types
import { MetatypeRelationshipPairT } from "@/lib/types";

export function renderRow(props: ListChildComponentProps) {
  const { data, index, style } = props;

  return (
    <ListItem style={style} key={index} component="div">
      <ListItemButton>
        <ListItemText
          primary={data.origin_metatype_name}
          secondary={data.origin_id}
        />
      </ListItemButton>
    </ListItem>
  );
}

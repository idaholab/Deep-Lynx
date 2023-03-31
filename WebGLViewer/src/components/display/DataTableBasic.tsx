// React
import * as React from 'react';

// MUI Components
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
} from '@mui/material';

// MUI Icons
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

// Styles
// @ts-ignore
import COLORS from '../../styles/variables';

type Props = {
  tableHeaders: Array<{ [key: string]: any; }>;
  tableRowData: Array<{ [key: string]: any; }>;
  tableRowActions: Array<{ [key: string]: any; }>;
};

const DataTableBasic: React.FC<Props> = ({
  tableHeaders,
  tableRowData,
  tableRowActions
}) => {

  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(5);
  const [selected, setSelected] = React.useState(1);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // const isSelected = (id: string) => selected.indexOf(id) !== -1;

  const handleClick = (event: React.MouseEvent<unknown>, id: number) => {
    const selectedIndex = id;
    // let newSelected: readonly string[] = [];

    // if (selectedIndex === -1) {
    //   newSelected = newSelected.concat(selected, id);
    // } else if (selectedIndex === 0) {
    //   newSelected = newSelected.concat(selected.slice(1));
    // } else if (selectedIndex === selected.length - 1) {
    //   newSelected = newSelected.concat(selected.slice(0, -1));
    // } else if (selectedIndex > 0) {
    //   newSelected = newSelected.concat(
    //     selected.slice(0, selectedIndex),
    //     selected.slice(selectedIndex + 1),
    //   );
    // }

    // if (selectedIndex === -1) {
    //   newSelected = newSelected.concat(selected, id);
    // } else if (selectedIndex === 0) {
    //   newSelected = newSelected.concat(selected.slice(1));
    // } else if (selectedIndex === selected.length - 1) {
    //   newSelected = newSelected.concat(selected.slice(0, -1));
    // } else if (selectedIndex > 0) {
    //   newSelected = newSelected.concat(
    //     selected.slice(0, selectedIndex),
    //     selected.slice(selectedIndex + 1),
    //   );
    // }

    setSelected(selectedIndex);
  }

  const isSelected = (id: number) => selected === id;

  return (
    <>
      <TableContainer>
        <Table size="small" sx={{ minWidth: 650 }} aria-label="simple table">
          <TableHead>
            <TableRow>
              {tableHeaders.map((tableHeader, index) => {
                return (
                  <TableCell
                    sx={{ fontWeight: 'bold'}}
                    width={tableHeader.optionalWidth}
                    align={tableHeader.alignment}
                    key={index}
                  >
                    { tableHeader.title }
                  </TableCell>
                )
              })}
            </TableRow>
          </TableHead>
          <TableBody>
            {tableRowData.map((tableRow: any, index) => {
              const isItemSelected = isSelected(tableRow.id);
              return (
                <TableRow
                  hover
                  onClick={(event) => handleClick(event, tableRow.id)}
                  key={index}
                  tabIndex={-1}
                  selected={isItemSelected}
                  sx={{
                    '&:last-child td, &:last-child th': {
                      border: 0
                    },
                    '&:hover': {
                      cursor: 'pointer'
                    }
                  }}
                >
                  <>
                    {Object.entries(tableRow).map(([key, value]) => {     
                      if (Array.isArray(value)) {
                        return (
                          <TableCell align="left" key={key}>{ value.length }</TableCell>
                        )
                      } else {
                        return (
                          // @ts-ignore
                          <TableCell align="left" key={key}>{ value.toString() }</TableCell>
                        )
                      }
                    })}
                    {tableRowActions.length !== 0
                      ? (
                        <TableCell align="center">
                          {tableRowActions.map((action, index) => {
                            switch (action.type) {
                              case 'view':
                                return (
                                  <VisibilityIcon key={index} sx={{ fill: COLORS.colorPrimary }} />
                                );
                              case 'edit':
                                return (
                                  <EditIcon key={index} sx={{ fill: COLORS.colorPrimary }} />
                                );
                              case 'delete':
                                return (
                                  <DeleteIcon key={index} sx={{ fill: COLORS.colorError }} />
                                );
                              default:
                                break;
                            }
                          })}
                        </TableCell>
                      ) : null
                    }
                  </>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={tableRowData.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </>
  );
}

export default DataTableBasic;

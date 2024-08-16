// Redux
import { configureStore } from "@reduxjs/toolkit";

// Reducers
import { containerReducer } from "./features/container/containerSlice";
import { themeReducer } from "./features/themeSlice";
import { ontologyReducer } from "./features/ontology/ontologySlice";

export const makeStore = () => {
  return configureStore({
    reducer: {
      container: containerReducer,
      theme: themeReducer,
      ontology: ontologyReducer,
    },
  });
};

// Infer the type of makeStore
export type AppStore = ReturnType<typeof makeStore>;
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];

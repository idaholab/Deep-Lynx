import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store';

// Use throughout your app instead of plain `useSelector` and `useDispatch`

//Typed `useSelector` to work better with TypeScript
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Not typed, just created for sake of uniformity, since `useSelector` is typed. Regular `useDispatch` should still work fine.
export const useAppDispatch: () => AppDispatch = useDispatch;

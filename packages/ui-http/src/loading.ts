import { HttpContextToken, type HttpInterceptorFn } from '@angular/common/http';
import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { finalize } from 'rxjs';

/** Set on a request that should not show the global loading indicator (e.g. a search while typing). */
export const SKIP_GLOBAL_LOADING = new HttpContextToken<boolean>(() => false);

/** Same switch for code that works with plain headers; removed before the request leaves. */
export const SKIP_LOADER_HEADER = 'X-Skip-Loader';

/** Global loading state: a counter, so parallel requests do not hide the indicator early. */
export const LoadingStore = signalStore(
  { providedIn: 'root' },
  withState({ pending: 0 }),
  withComputed(({ pending }) => ({ isLoading: computed(() => pending() > 0) })),
  withMethods((store) => ({
    start(): void {
      patchState(store, (state) => ({ pending: state.pending + 1 }));
    },
    stop(): void {
      patchState(store, (state) => ({ pending: Math.max(0, state.pending - 1) }));
    },
  })),
);

/** Counts in-flight requests in `LoadingStore`, except those that opt out. */
export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const headerSkip = req.headers.has(SKIP_LOADER_HEADER);
  const request = headerSkip ? req.clone({ headers: req.headers.delete(SKIP_LOADER_HEADER) }) : req;
  if (headerSkip || request.context.get(SKIP_GLOBAL_LOADING)) return next(request);

  const loading = inject(LoadingStore);
  loading.start();
  return next(request).pipe(finalize(() => loading.stop()));
};

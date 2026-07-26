import { useEffect, useState, useCallback } from 'react';

/** The loading/error/data pattern repeated by hand across nearly
 *  every page (BeliefTrackerTab, ScheduleTemplateTab, DreamLifeTab,
 *  and dozens more all rewrite the same useState + useEffect +
 *  try/catch boilerplate). One hook now.
 *
 *  `queryFn` can return anything — a list, an object combining
 *  several queries, whatever the page actually needs — this hook
 *  doesn't care about the shape, only about loading/error/refresh.
 *
 *  Usage:
 *    const { data: beliefs, loading, error, refresh } = useSupabaseQuery(
 *      () => listBeliefs(), []
 *    );
 *
 *  `deps` works like useEffect's dependency array — pass values that
 *  should trigger a refetch (e.g. a date, a filter) the same way you
 *  already would. */
export function useSupabaseQuery(queryFn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await queryFn());
    } catch (err) {
      setError(err.message || String(err));
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { refresh(); }, [refresh]);

  return { data, loading, error, refresh };
}

export default useSupabaseQuery;

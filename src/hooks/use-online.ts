import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

import { dbSubscribe, isDemo } from '@/lib/db';

/**
 * `internet`: phone has a network connection.
 * `firebase`: the Realtime Database socket is connected (data is live, not cached).
 */
export function useOnline() {
  const [internet, setInternet] = useState(true);
  const [firebase, setFirebase] = useState(true);

  useEffect(() => {
    const unsubNet = NetInfo.addEventListener((s) => setInternet(s.isConnected !== false));
    let unsubDb = () => {};
    if (!isDemo) {
      unsubDb = dbSubscribe('.info/connected', undefined, (v) => setFirebase(v === true));
    }
    return () => {
      unsubNet();
      unsubDb();
    };
  }, []);

  return { internet, firebase, online: internet && firebase };
}

import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import { api } from "./api";

type NetworkListener = (isOnline: boolean) => void;

class NetworkService {
  private isConnected: boolean = true;
  private isServerReachable: boolean = true;
  private listeners: Set<NetworkListener> = new Set();

  constructor() {
    this.init();
  }

  private init() {
    NetInfo.addEventListener((state: NetInfoState) => {
      const connected = Boolean(
        state.isConnected && state.isInternetReachable !== false,
      );
      const changed = connected !== this.isConnected;
      this.isConnected = connected;
      if (changed) {
        this.notifyListeners();
      }
    });

    // Initial check
    NetInfo.fetch().then((state) => {
      this.isConnected = Boolean(
        state.isConnected && state.isInternetReachable !== false,
      );
      this.notifyListeners();
    });
  }

  public get online(): boolean {
    return this.isConnected;
  }

  public async checkServerConnection(): Promise<boolean> {
    try {
      const res = await api.get("/notes?limit=1", { timeout: 4000 });
      this.isServerReachable = res.status >= 200 && res.status < 400;
      return this.isServerReachable;
    } catch (err: any) {
      // If 401 Unauthorized, the server is still alive and reachable!
      if (err.response?.status === 401) {
        this.isServerReachable = true;
        return true;
      }
      this.isServerReachable = false;
      return false;
    }
  }

  public addListener(listener: NetworkListener): () => void {
    this.listeners.add(listener);
    // Immediately invoke with current state
    listener(this.isConnected);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.isConnected);
      } catch (err) {
        console.warn("[NetworkService] Listener error:", err);
      }
    });
  }
}

export const networkService = new NetworkService();

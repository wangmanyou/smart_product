import { LOGIN_PATH } from '@/constants';
import { refreshTokenApi } from '@/services/user';

type ListenerItem = (newToken: string) => void;

export class TokenManager {
  private isRefreshing = false; // 是否正在刷新accessToken
  private subscribers: ListenerItem[] = []; // 重试队列，每一项将是一个待执行的函数形式

  public getIsRefreshing(): boolean {
    return this.isRefreshing;
  }
  public setToken(val: string): void {
    window.localStorage.setItem('accessToken', val);
  }

  public resetToken(): void {
    window.localStorage.removeItem('accessToken');
    window.localStorage.removeItem('refreshToken');
  }

  public addToNoneTokenRequestList(listener: ListenerItem): void {
    this.subscribers.push(listener);
  }

  public retryRequest(newToken: string): void {
    this.subscribers.forEach((callback) => callback(newToken));
    this.subscribers.length = 0;
  }

  public async refreshAccessToken(
    callback: (token: string) => Promise<any>,
  ): Promise<void> {
    if (!this.isRefreshing) {
      try {
        this.isRefreshing = true;
        const refreshToken = window.localStorage.getItem('refreshToken');
        if (refreshToken) {
          /* 利用长token重新获取短token */
          const res = await refreshTokenApi(`Bearer ${refreshToken}`);
          const accessToken = res?.data?.access_token;
          this.setToken(accessToken);
          this.retryRequest(accessToken);
          return callback(accessToken);
        }
        return;
      } catch (err) {
        this.clearAuthAndRedirect();
        return;
      } finally {
        this.isRefreshing = false;
      }
    } else {
      return new Promise<void>((resolve) => {
        this.addToNoneTokenRequestList((token) => resolve(callback(token)));
      });
    }
  }

  /* 清除长短token，并定位到登录页（在项目中使用路由跳转） */
  public clearAuthAndRedirect(): void {
    this.resetToken();
    window.location.href = LOGIN_PATH;
  }
}

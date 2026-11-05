class WebNotificationService {
  async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn('Este navegador no soporta notificaciones de escritorio.');
      return false;
    }

    try {
      const WebNotification = (window as any).Notification;
      if (WebNotification.permission === 'granted') {
        return true;
      }

      if (WebNotification.permission !== 'denied') {
        const result = await WebNotification.requestPermission();
        return result === 'granted';
      }
      return false;
    } catch (err) {
      console.warn('Error solicitando permisos de notificación en web:', err);
      return false;
    }
  }

  async sendLocalNotification(title: string, body: string): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    const WebNotification = (window as any).Notification;

    if (!WebNotification) {
      (globalThis as any).alert?.(`🔔 ${title}\n\n${body}`);
      return true;
    }

    let granted = WebNotification.permission === 'granted';
    if (!granted && WebNotification.permission !== 'denied') {
      granted = await this.requestPermission();
    }

    if (granted) {
      try {
        new WebNotification(title, {
          body,
          icon: '/favicon.png',
        });
        return true;
      } catch (e) {
        console.warn('Error al mostrar notificación web:', e);
      }
    }

    // Si los permisos en navegador fueron bloqueados, mostramos alerta visible
    (globalThis as any).alert?.(`🔔 ${title}\n\n${body}`);
    return true;
  }

  async scheduleLocalNotification(title: string, body: string, seconds: number): Promise<boolean> {
    setTimeout(() => {
      void this.sendLocalNotification(title, body);
    }, Math.max(1, seconds) * 1000);
    return true;
  }

  async notifyStockAlert(name: string, stock: number, minStock: number, unit: string): Promise<boolean> {
    return this.sendLocalNotification(
      '⚠️ Alerta de Stock Crítico',
      `El insumo "${name}" tiene ${stock} ${unit} (mínimo: ${minStock} ${unit}). Se requiere reposición.`
    );
  }

  async notifyActionSuccess(action: string, entity: string, name: string): Promise<boolean> {
    return this.sendLocalNotification(
      `✅ ${entity} ${action}`,
      `Se ha ${action.toLowerCase()} exitosamente "${name}" en AgroTecno.`
    );
  }
}

export const notificationService = new WebNotificationService();

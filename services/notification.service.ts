import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

// Configura el comportamiento cuando la app está abierta en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

class NativeNotificationService {
  private channelConfigured = false;

  private async setupChannel() {
    if (this.channelConfigured) return;
    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Alertas AgroTecno',
          importance: AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#0F766E',
        });
      } catch (channelError) {
        console.warn('Canal de notificaciones Android:', channelError);
      }
      this.channelConfigured = true;
    }
  }

  async requestPermission(): Promise<boolean> {
    try {
      await this.setupChannel();
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      return finalStatus === 'granted';
    } catch (permError) {
      console.warn('Error al solicitar permisos de notificación:', permError);
      return false;
    }
  }

  async sendLocalNotification(title: string, body: string): Promise<boolean> {
    try {
      await this.setupChannel();
      const hasPerm = await this.requestPermission();
      if (!hasPerm) return false;

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          data: { timestamp: Date.now() },
        },
        trigger: null,
      });
      return true;
    } catch (error) {
      console.warn('Error al emitir notificación local:', error);
      return false;
    }
  }

  async scheduleLocalNotification(title: string, body: string, seconds: number): Promise<boolean> {
    try {
      await this.setupChannel();
      const hasPerm = await this.requestPermission();
      if (!hasPerm) return false;

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          data: { timestamp: Date.now() },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: Math.max(1, seconds),
        },
      });
      return true;
    } catch (error) {
      console.warn('Error al programar notificación local:', error);
      return false;
    }
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

export const notificationService = new NativeNotificationService();

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// Register the app for web
AppRegistry.registerComponent(appName, () => App);
AppRegistry.runApplication(appName, {
  initialProps: {},
  rootTag: document.getElementById('root')
}); 
// Navegación que pide el visor 3D al pulsar "Ir a la sección" o "Ver proyecto".
// Vive aparte del componente para que importarla no anule su carga diferida.
export interface ViewerNavigation {
  commands: string[];
  fragment?: string;
}

 

**DOCUMENTO DE REQUISITOS**

*Especificación de Requisitos de Software*

 

 

**AbarroteSaaS**

Plataforma de Digitalización para Tiendas de Abarrotes

 

| Versión: | 1.2 |
| ----: | :---- |
| Fecha: | **Marzo 2026** |
| Estado: | **Draft v1** |

# **1\. Resumen Ejecutivo**

AbarroteSaaS es una plataforma SaaS (Software as a Service) diseñada para la digitalización de tiendas de abarrotes. Permite al Encargado gestionar inventarios, registrar ventas y administrar créditos (fiado) desde cualquier dispositivo móvil, sin necesidad de hardware especializado.

 

La aplicación se entrega como una PWA (Progressive Web App), lo que permite su instalación en smartphones como si fuera una app nativa, aprovechando la cámara del dispositivo como escáner de códigos de barras. El modelo multi-tenant garantiza que los datos de cada tienda estén completamente aislados entre sí.

 

| Capa | Tecnología | Justificación |
| :---- | :---- | :---- |
| **Frontend** | React \+ Vite (PWA) | Desarrollo ágil, soporte nativo de Service Workers y PWA |
| **Backend** | Node.js \+ Supabase Edge Functions | API REST ligera con lógica de negocio centralizada |
| **Base de Datos** | Supabase (PostgreSQL) | Auth, RLS, tiempo real y almacenamiento integrados |
| **Escáner** | html5-qrcode / @zxing/library | Acceso a cámara vía navegador sin instalación adicional |
| **Gráficas** | Recharts | Librería React optimizada para datos JSON dinámicos |
| **Offline** | IndexedDB \+ Service Workers | Sincronización diferida sin pérdida de datos |

 

# **2\. Análisis de Mejoras y Puntos Consolidados**

Se realizó una revisión de las dos propuestas de requisitos originales. A continuación se documentan las observaciones, redundancias detectadas y mejoras aplicadas en esta versión consolidada.

 

| *CONSOLIDACIÓN: RF-03 (Inventario Inteligente) y RF-05 (Inventario) de las propuestas originales se fusionaron en un único módulo para evitar duplicidad. La lógica de descuento automático de stock ahora forma parte de la definición de ventas (RF-06).* |
| :---- |

 

| *MEJORA: En la propuesta 1 se mencionaba "carga masiva vía CSV/Excel" únicamente. Se amplió para incluir también creación manual de productos y eliminación lógica (borrado suave), que son esenciales para producción.* |
| :---- |

 

| *MEJORA: RNF-01 establecía "escaneo \< 1s" pero omitía el tiempo de registro completo de una venta. La versión consolidada especifica \<= 5 segundos para el ciclo completo de venta como métrica más representativa.* |
| :---- |

 

| *MEJORA: Se unificó el módulo de Reportes (RF-09 de propuesta 2\) con el Dashboard de Analítica (RF-06 de propuesta 1), ya que ambos cubrían la misma necesidad con diferente nivel de detalle. La versión final distingue entre reportes operativos y analítica visual.* |
| :---- |

 

| *ADICIÓN: Se incorporó explícitamente RNF-08 de Cumplimiento Legal (Términos, Aviso de Privacidad y protección de datos para México), presente en propuesta 2 pero ausente en propuesta 1\.* |
| :---- |

 

| *CAMBIO v1.2: RF-02 se simplificó de un esquema Dueño/Empleado a un único perfil de Encargado. Esta decisión refleja la naturaleza familiar de los negocios de abarrotes, donde una sola persona de confianza opera el sistema completo. Se eliminaron todas las restricciones de acceso diferenciado entre roles.* |
| :---- |

 

| *ADICIÓN v1.2: Se incorporó RF-12 (Modo Oscuro / Claro) como requisito funcional, alineado con los tokens de diseño ya definidos en §5.2. El botón de alternancia es un requisito de usabilidad para entornos con distintas condiciones de iluminación (mostrador, bodega, noche).* |
| :---- |

 

# **3\. Requisitos Funcionales (RF)**

Los requisitos funcionales describen el comportamiento observable del sistema desde la perspectiva del usuario. Cada requisito está identificado con un código único para facilitar su trazabilidad durante el desarrollo y las pruebas.

 

## **RF-01 · Autenticación y Gestión de Sesiones**

| RF-01 | Autenticación y Gestión de Sesiones |
| :---- | :---- |
| *El sistema debe gestionar el acceso seguro de usuarios mediante autenticación propia, soportada por Supabase Auth.* |  |
| **RF-01.01** | El sistema debe permitir el registro de nuevos usuarios mediante correo electrónico y contraseña. |
| **RF-01.02** | El sistema debe permitir el inicio y cierre de sesión de usuarios registrados. |
| **RF-01.03** | El sistema debe permitir la recuperación de contraseña mediante correo electrónico. |
| **RF-01.04** | El sistema debe mantener sesiones persistentes y seguras con tokens de acceso y refresco. |
| **RF-01.05** | El sistema debe registrar la fecha y hora de aceptación de los Términos y Condiciones en el momento del registro. |
| **RF-01.06** | El sistema debe bloquear el acceso automáticamente cuando la suscripción esté vencida o suspendida. |
| **RF-01.07** | El sistema debe mostrar avisos anticipados (7 y 1 día antes) del vencimiento de la suscripción. |

 

## **RF-02 · Perfil de Encargado**

| RF-02 | Perfil de Encargado |
| :---- | :---- |
| *El sistema opera con un único perfil de usuario: el Encargado. Este modelo refleja la realidad de los negocios familiares de abarrotes, donde una sola persona (o miembros de confianza de la familia) tiene acceso completo a todas las funciones del sistema.* |  |
| **RF-02.01** | El sistema debe manejar un único rol: Encargado, con acceso total a todas las funciones de la aplicación. |
| **RF-02.02** | El Encargado debe tener acceso a: ventas, inventario, fiado, reportes, costos, ganancias y configuración de la tienda. |
| **RF-02.03** | El Encargado debe poder gestionar la suscripción y los datos generales de la tienda. |
| **RF-02.04** | El sistema debe permitir que un mismo correo gestione múltiples tiendas bajo un único inicio de sesión. |
| **RF-02.05** | El sistema debe validar la identidad del Encargado en cada sesión mediante token seguro gestionado por Supabase Auth. |
| *⚠ Nota: Al eliminar la distinción Dueño/Empleado se simplifica la arquitectura de permisos. Si en el futuro el negocio crece y requiere roles diferenciados, se puede extender este módulo sin rediseñar el esquema base.* |  |

 

## **RF-03 · Gestión de Tiendas (Multi-Tenant)**

| RF-03 | Gestión de Tiendas (Multi-Tenant) |
| :---- | :---- |
| *Cada tienda representa un tenant independiente. Sus datos deben estar completamente aislados de los de otras tiendas.* |  |
| **RF-03.01** | El sistema debe permitir crear una o más tiendas asociadas a un mismo Encargado. |
| **RF-03.02** | El sistema debe permitir editar el nombre, logo y datos básicos de la tienda. |
| **RF-03.03** | El sistema debe garantizar el aislamiento de datos entre tiendas mediante Row Level Security (RLS) en Supabase. |
| **RF-03.04** | Ningún usuario debe poder ver, modificar ni inferir datos pertenecientes a una tienda a la que no pertenece. |
| **RF-03.05** | El sistema debe permitir cambiar de tienda activa cuando el Encargado administre más de una. |
| *⚠ Nota: El aislamiento por tenant\_id es un requisito crítico de seguridad y debe verificarse en pruebas de integración antes de cada despliegue a producción.* |  |

 

## **RF-04 · Gestión de Productos**

| RF-04 | Gestión de Productos |
| :---- | :---- |
| *El sistema debe permitir administrar el catálogo de productos de cada tienda con soporte para importación masiva y etiquetado interno.* |  |
| **RF-04.01** | El sistema debe permitir la creación manual de productos, uno a uno. |
| **RF-04.02** | El sistema debe permitir la importación masiva de productos mediante archivos CSV o Excel. |
| **RF-04.03** | Cada producto debe contener: nombre, precio de venta, costo (opcional), stock actual, categoría y código de barras (opcional). |
| **RF-04.04** | El sistema debe generar un código de barras interno para productos que no cuenten con uno (ej. frutas, pan a granel). |
| **RF-04.05** | El sistema debe permitir editar cualquier atributo de un producto existente. |
| **RF-04.06** | El sistema debe implementar eliminación lógica (soft delete): los productos eliminados no deben aparecer en ventas activas, pero sí en el historial. |
| **RF-04.07** | El sistema debe permitir buscar productos por nombre, categoría o código de barras. |
| **RF-04.08** | El sistema debe mostrar alertas visuales cuando el stock de un producto caiga por debajo de un umbral configurable. |

 

## **RF-05 · Gestión de Inventario**

| RF-05 | Gestión de Inventario |
| :---- | :---- |
| *El sistema debe mantener un registro preciso del stock disponible, actualizándolo de forma automática ante cada movimiento.* |  |
| **RF-05.01** | El sistema debe registrar entradas de inventario (compras o reabastecimiento) con fecha y cantidad. |
| **RF-05.02** | El sistema debe descontar automáticamente el stock al confirmar una venta. |
| **RF-05.03** | El sistema debe permitir ajustes manuales de inventario para casos de merma, pérdida o error de captura. |
| **RF-05.04** | El sistema debe registrar el motivo del ajuste manual para trazabilidad. |
| **RF-05.05** | El sistema debe mostrar el historial de movimientos de inventario por producto. |
| **RF-05.06** | El sistema debe mostrar alertas visuales de stock bajo en el panel de inventario y en el punto de venta. |

 

## **RF-06 · Punto de Venta (Panel de Ventas)**

| RF-06 | Punto de Venta (Panel de Ventas) |
| :---- | :---- |
| *El sistema debe ofrecer una interfaz rápida e intuitiva para el registro de ventas, optimizada para uso en dispositivos móviles.* |  |
| **RF-06.01** | El sistema debe permitir agregar productos al carrito mediante escaneo de código de barras con la cámara del dispositivo. |
| **RF-06.02** | El sistema debe proporcionar respuesta háptica (vibración) al escanear correctamente un código. |
| **RF-06.03** | El sistema debe permitir agregar productos al carrito mediante búsqueda por nombre o categoría. |
| **RF-06.04** | El sistema debe calcular automáticamente el subtotal, descuentos (si aplica) y total de la venta. |
| **RF-06.05** | El sistema debe permitir "pausar" un carrito activo para atender a otro cliente, sin perder los artículos ya agregados. |
| **RF-06.06** | El sistema debe registrar cada venta con: fecha, hora, usuario cajero, productos, cantidades, total y método de pago. |
| **RF-06.07** | El sistema debe permitir cancelar ventas según los permisos del rol del usuario. |
| **RF-06.08** | El sistema debe soportar al menos los métodos de pago: efectivo y fiado (crédito) en el MVP. |
| **RF-06.09** | El sistema debe mostrar el cambio (vuelto) cuando el método de pago es efectivo. |

 

## **RF-07 · Corte de Caja**

| RF-07 | Corte de Caja |
| :---- | :---- |
| *El sistema debe generar resúmenes de cierre de turno o día para el control de ingresos.* |  |
| **RF-07.01** | El sistema debe generar cortes de caja por turno o por día calendario. |
| **RF-07.02** | El corte debe mostrar: total vendido, número de transacciones y desglose por método de pago. |
| **RF-07.03** | El sistema debe permitir al Encargado consultar cortes históricos con filtro por fecha. |
| **RF-07.04** | El sistema debe permitir cancelar o ajustar un corte antes de cerrarlo definitivamente. |

 

## **RF-08 · Módulo de Fiado (Crédito a Clientes)**

| RF-08 | Módulo de Fiado (Crédito a Clientes) |
| :---- | :---- |
| *El sistema debe administrar el crédito otorgado a clientes frecuentes, con seguimiento de saldos y abonos.* |  |
| **RF-08.01** | El sistema debe permitir registrar clientes de fiado con nombre, teléfono y límite de crédito. |
| **RF-08.02** | El sistema debe permitir asociar una venta a la cuenta de fiado de un cliente. |
| **RF-08.03** | El sistema debe mostrar el saldo pendiente actualizado de cada cliente. |
| **RF-08.04** | El sistema debe permitir registrar abonos parciales o totales a la deuda de un cliente. |
| **RF-08.05** | El sistema debe mostrar el historial completo de movimientos (ventas y abonos) por cliente. |
| **RF-08.06** | El sistema debe impedir agregar crédito si el cliente ha superado su límite configurado, mostrando una advertencia. |

 

## **RF-09 · Reportes y Analítica**

| RF-09 | Reportes y Analítica |
| :---- | :---- |
| *El sistema debe ofrecer reportes operativos y analítica visual para apoyar la toma de decisiones del Encargado. Los datos se obtienen mediante vistas SQL para optimizar el rendimiento.* |  |
| **RF-09.01** | El sistema debe mostrar una gráfica de barras con ventas y ganancias agrupadas por día o semana. |
| **RF-09.02** | El sistema debe mostrar los 5 productos o categorías más vendidos mediante gráfica de pastel o similar. |
| **RF-09.03** | El sistema debe calcular y mostrar el ticket promedio por cliente. |
| **RF-09.04** | El sistema debe permitir filtrar todos los reportes por rango de fechas personalizado. |
| **RF-09.05** | El sistema debe mostrar la ganancia estimada del periodo seleccionado (precio venta \- costo). |
| **RF-09.06** | El sistema debe mostrar un listado de productos con stock crítico. |
| *⚠ Nota: Las consultas de reportes deben ejecutarse contra Vistas o Funciones SQL agregadas, nunca contra el detalle de tickets individuales, para mantener el rendimiento con catálogos grandes.* |  |

 

## **RF-10 · Gestión de Suscripción**

| RF-10 | Gestión de Suscripción |
| :---- | :---- |
| *El sistema debe administrar el estado del plan de cada tenant y controlar el acceso al servicio según el estado de pago.* |  |
| **RF-10.01** | El sistema debe registrar y mantener actualizado el estado de la suscripción por tienda. |
| **RF-10.02** | El sistema debe mostrar avisos de vencimiento próximo (7 días y 1 día antes). |
| **RF-10.03** | El sistema debe bloquear el acceso a funciones operativas cuando la suscripción esté vencida, manteniendo solo lectura de datos. |
| **RF-10.04** | El sistema debe permitir la reactivación del servicio inmediatamente tras confirmarse el pago. |
| **RF-10.05** | El sistema debe mostrar al Dueño el historial de pagos y fechas de renovación. |

 

## **RF-11 · PWA e Instalación**

| RF-11 | PWA e Instalación |
| :---- | :---- |
| *La aplicación debe cumplir con los estándares de Progressive Web App para ser instalable y funcionar en modo offline.* |  |
| **RF-11.01** | La aplicación debe ser instalable desde el navegador en dispositivos iOS y Android (Add to Home Screen). |
| **RF-11.02** | La aplicación debe funcionar en modo offline para las operaciones de registro de ventas. |
| **RF-11.03** | El sistema debe almacenar localmente las ventas realizadas sin conexión usando IndexedDB. |
| **RF-11.04** | El sistema debe sincronizar automáticamente los datos pendientes al recuperar la conexión a internet. |
| **RF-11.05** | La aplicación debe mostrar al usuario el estado de conectividad (online/offline) de forma clara. |
| **RF-11.06** | El sistema debe manejar conflictos de sincronización sin pérdida de datos. |

## **RF-12 · Modo Oscuro / Claro**

| RF-12 | Modo Oscuro / Claro |
| :---- | :---- |
| *El sistema debe permitir al Encargado alternar entre tema visual claro y oscuro según sus preferencias o condiciones de luz del local.* |  |
| **RF-12.01** | El sistema debe incluir un botón o interruptor visible y accesible en la barra de navegación principal para cambiar entre modo claro y modo oscuro. |
| **RF-12.02** | El cambio de tema debe aplicarse de forma inmediata en toda la interfaz sin recargar la página. |
| **RF-12.03** | El sistema debe recordar la preferencia de tema del Encargado entre sesiones (persistencia en localStorage o perfil de usuario). |
| **RF-12.04** | El sistema debe respetar la preferencia del sistema operativo del dispositivo (prefers-color-scheme) como valor inicial al primer uso. |
| **RF-12.05** | Todos los componentes de la interfaz (tablas, modales, gráficas, formularios) deben adaptarse correctamente a ambos temas sin pérdida de legibilidad. |
| **RF-12.06** | Los colores semánticos (éxito, alerta, peligro) deben mantener su contraste mínimo WCAG AA en ambos modos. |
| *⚠ Nota: Este requisito se alinea con los tokens de diseño definidos en §5.2 (Superficies e Interfaz). La implementación recomendada es mediante variables CSS dinámicas (--surface-base, \--surface-card, etc.) controladas por un atributo data-theme en el elemento raíz del DOM.* |  |

 

# **4\. Requisitos No Funcionales (RNF)**

Los requisitos no funcionales definen las restricciones de calidad del sistema: cómo debe comportarse, no qué debe hacer. Son igual de importantes que los funcionales y deben considerarse desde el inicio del desarrollo.

 

## **RNF-01 · Rendimiento**

| RNF-01 | Rendimiento |
| :---- | :---- |
| **RNF-01.01** | La carga inicial de la aplicación (First Contentful Paint) debe completarse en menos de 3 segundos en una red 4G. |
| **RNF-01.02** | El ciclo completo de registro de una venta (escaneo \+ confirmación \+ actualización de stock) no debe superar los 5 segundos. |
| **RNF-01.03** | El procesamiento de un código de barras escaneado debe reflejar el producto en pantalla en menos de 1 segundo. |
| **RNF-01.04** | Las consultas de reportes deben retornar resultados en menos de 4 segundos para periodos de hasta 12 meses. |
| **RNF-01.05** | La aplicación debe mantener su rendimiento con catálogos de hasta 10,000 productos activos por tienda. |

 

## **RNF-02 · Usabilidad**

| RNF-02 | Usabilidad |
| :---- | :---- |
| **RNF-02.01** | La interfaz debe seguir un diseño "Fat-Finger": botones táctiles con un área mínima de 44x44 puntos CSS. |
| **RNF-02.02** | Las acciones críticas (iniciar venta, cobrar, agregar producto) deben ser accesibles en máximo 3 interacciones desde la pantalla principal. |
| **RNF-02.03** | El sistema debe ser operable por usuarios sin conocimientos técnicos previos en sistemas de punto de venta. |
| **RNF-02.04** | La interfaz debe ser consistente en iconografía, colores y flujos a lo largo de todos los módulos. |
| **RNF-02.05** | El sistema debe ser compatible con lectores de códigos de barras físicos que emulan teclado (modo HID). |

 

## **RNF-03 · Seguridad**

| RNF-03 | Seguridad |
| :---- | :---- |
| **RNF-03.01** | Toda la comunicación entre el cliente y el servidor debe realizarse exclusivamente sobre HTTPS. |
| **RNF-03.02** | El sistema debe implementar Row Level Security (RLS) en Supabase para aislar los datos por tenant\_id. |
| **RNF-03.03** | Los permisos deben validarse en el backend; el frontend solo oculta elementos como ayuda visual, no como mecanismo de seguridad. |
| **RNF-03.04** | Las contraseñas deben almacenarse usando hashing seguro (bcrypt o equivalente, gestionado por Supabase Auth). |
| **RNF-03.05** | Los tokens de sesión deben tener expiración y soporte de refresco automático. |
| **RNF-03.06** | El acceso a datos de costos y ganancias debe estar restringido a nivel de base de datos para el rol Empleado. |

 

## **RNF-04 · Disponibilidad y Continuidad**

| RNF-04 | Disponibilidad y Continuidad |
| :---- | :---- |
| **RNF-04.01** | El sistema debe tener una disponibilidad objetivo de 99.5% mensual (excluyendo mantenimientos programados). |
| **RNF-04.02** | Las caídas parciales del backend no deben causar pérdida de datos gracias al modo offline de la PWA. |
| **RNF-04.03** | Los mantenimientos programados deben notificarse con al menos 24 horas de anticipación. |

 

## **RNF-05 · Escalabilidad**

| RNF-05 | Escalabilidad |
| :---- | :---- |
| **RNF-05.01** | El sistema debe soportar el crecimiento progresivo de tiendas sin cambios de arquitectura. |
| **RNF-05.02** | La base de datos debe estar normalizada y con índices optimizados para las consultas más frecuentes. |
| **RNF-05.03** | El backend debe soportar escalado horizontal mediante Supabase Edge Functions o servicios stateless. |
| **RNF-05.04** | El diseño del esquema de base de datos debe permitir incorporar nuevos módulos sin reestructuración de tablas existentes. |

 

## **RNF-06 · Compatibilidad**

| RNF-06 | Compatibilidad |
| :---- | :---- |
| **RNF-06.01** | La aplicación debe funcionar correctamente en Chrome, Safari, Firefox y Edge en sus versiones estables más recientes. |
| **RNF-06.02** | La interfaz debe ser completamente funcional en smartphones con pantallas de 4.7" en adelante. |
| **RNF-06.03** | La interfaz debe adaptarse correctamente a tablets (768px y superiores) con un layout optimizado. |
| **RNF-06.04** | El módulo de escaneo debe funcionar en dispositivos Android e iOS con acceso a cámara trasera. |
| **RNF-06.05** | La aplicación debe ser compatible con lectores de código de barras externos que emulen entrada de teclado. |

 

## **RNF-07 · Mantenibilidad**

| RNF-07 | Mantenibilidad |
| :---- | :---- |
| **RNF-07.01** | El código del frontend debe estar organizado por módulos funcionales (inventario, ventas, fiado, etc.). |
| **RNF-07.02** | El backend debe seguir una arquitectura por capas: rutas, controladores, servicios y acceso a datos. |
| **RNF-07.03** | El sistema debe permitir incorporar nuevas funcionalidades sin modificar el núcleo de módulos existentes. |
| **RNF-07.04** | El proyecto debe contar con README actualizado, documentación de API y variables de entorno documentadas. |
| **RNF-07.05** | Los cambios de esquema en la base de datos deben gestionarse mediante migraciones versionadas. |

 

## **RNF-08 · Cumplimiento Legal**

| RNF-08 | Cumplimiento Legal |
| :---- | :---- |
| **RNF-08.01** | El sistema debe contar con Términos y Condiciones de uso redactados y accesibles desde el registro y el pie de página. |
| **RNF-08.02** | El sistema debe contar con un Aviso de Privacidad conforme a la LFPDPPP (Ley Federal de Protección de Datos Personales en Posesión de los Particulares) de México. |
| **RNF-08.03** | El sistema debe registrar la aceptación explícita de los términos legales por parte del usuario en el momento del registro, con timestamp. |
| **RNF-08.04** | El sistema no debe transferir datos personales de clientes finales a terceros sin consentimiento. |

 

# **5\. Especificación de Diseño UI/UX**

Esta sección define los estándares visuales e interactivos de AbarroteSaaS bajo una arquitectura de "Fuente Única de Verdad": colores, tipografía, espaciados y animaciones están centralizados para garantizar consistencia en todos los módulos (Ventas, Inventario, Fiado, Reportes). Todos los tokens de diseño deben implementarse como variables CSS para soportar los modos Claro y Oscuro.

 

| *NOTA DE INTEGRACIÓN: La paleta de colores aquí definida extiende y formaliza los colores usados en las tablas de requisitos de este documento. El azul de marca (brand-500) corresponde al BLUE\_MID del sistema de diseño interno. Cualquier cambio en la paleta debe reflejarse simultáneamente en el sistema de diseño y en los componentes de React.* |
| :---- |

 

## **5.1 · Paleta de Colores Semántica**

La paleta utiliza el modelo HSL para permitir variaciones de luminosidad coherentes y facilitar la generación de tonos claros/oscuros mediante ajuste del tercer parámetro.

 

| Token | Valor HSL | Uso principal |
| :---- | :---- | :---- |
| ***brand-300*** | hsl(222, 80%, 68%) | Hover states, íconos activos en sidebar oscuro |
| ***brand-500*** | hsl(222, 80%, 48%) | Sidebar, headers, botones de acción primaria |
| ***brand-700*** | hsl(222, 80%, 32%) | Pressed states, bordes de enfoque (focus ring) |
| ***success*** | hsl(145, 63%, 42%) | Ventas completadas, cobros exitosos, stock OK |
| ***warning*** | hsl(32, 95%, 50%) | Stock bajo, CTAs de reabastecimiento, alertas |
| ***danger*** | hsl(0, 72%, 51%) | Deudas vencidas (fiado), errores, botón Eliminar |
| ***caution*** | hsl(48, 96%, 53%) | Corte de caja en proceso, advertencias no críticas |

 

## **5.2 · Superficies e Interfaz (UI)**

El sistema soporta Modo Claro y Modo Oscuro mediante variables CSS dinámicas. Las superficies se organizan en capas de elevación para crear jerarquía visual sin depender exclusivamente del color.

 

| Capa | Token CSS | Descripción y uso |
| :---- | :---- | :---- |
| **Base** | \--surface-base | Fondo de la aplicación (body). La capa más baja. |
| **Default** | \--surface-default | Paneles y secciones principales de contenido. |
| **Elevated** | \--surface-elevated | Sidebars, barras de navegación superiores. |
| **Card** | \--surface-card | Tarjetas de producto, widgets de dashboard, modales. |

 

Bordes y sombras: Radio de borde estándar de 10px (md) para botones e inputs; 14px (lg) para contenedores principales y tarjetas. Los estados activos utilizan "Glows" temáticos (ej. brand-glow-lg) implementados como box-shadow con el color semántico del elemento.

 

Sidebar: Ancho fijo de 240px con transiciones de 250ms para estados hover y colapso, evitando saltos bruscos de layout.

 

## **5.3 · Tipografía y Escala Visual**

Fuente principal: Inter (Sans-serif). Cargada desde Google Fonts con subset latino para minimizar el peso de carga. La escala sigue una progresión modular para mantener proporciones armónicas entre niveles.

 

| Token | Tamaño | Aplicación en la UI |
| :---- | :---- | :---- |
| **xxs** | **11px** | Metadatos, etiquetas de estado, timestamps secundarios |
| **xs** | **12px** | Texto de ayuda, placeholders, notas al pie de tarjetas |
| **sm** | **13px** | Labels de formularios, texto en tablas de inventario |
| **base** | **15px** | Cuerpo de texto principal, inputs, listas de productos |
| **lg** | **17px** | Subtítulos de sección, nombres de producto destacados |
| **2xl** | **24px** | Títulos de sección y módulo (ej. "Ventas del Día") |
| **4xl** | **36px** | Indicadores numéricos clave: totales de venta, saldo fiado |

 

## **5.4 · Micro-interacciones y Animaciones**

Las animaciones mejoran la percepción de velocidad del sistema sin distraer al usuario. Todas las duraciones están optimizadas para que la interfaz se sienta responsiva incluso mientras espera datos del servidor.

 

| Clase CSS | Duración | Cuándo y dónde usarlo |
| :---- | :---- | :---- |
| **fade-in** | 200ms | Aparición de elementos nuevos: resultados de búsqueda, notificaciones. |
| **slide-up** | 250ms | Entrada de modales desde la parte inferior (patrón móvil). |
| **slide-down** | 250ms | Despliegue de menús contextuales y dropdowns de categoría. |
| **pulse-dot** | 1.2s (loop) | Indicadores de estado de conexión y procesos en segundo plano. |
| **spin-fast** | 0.8s (loop) | Spinner de carga para operaciones asíncronas (guardar venta, sincronizar). |

 

| *CONSISTENCIA: Las transiciones estándar de hover y click deben ser siempre de 250ms. Evitar duraciones distintas para elementos del mismo tipo (ej. no mezclar botones a 150ms con otros a 300ms en la misma pantalla).* |
| :---- |

 

# **6\. Hoja de Ruta de Desarrollo**

El desarrollo se divide en tres fases progresivas para garantizar un lanzamiento temprano con valor para el usuario final y reducir el riesgo de construcción.

 

| Fase | Nombre | Módulos incluidos |
| :---- | :---- | :---- |
| **Fase 1 \- MVP** | Lanzamiento Básico | RF-01 · RF-02 · RF-03 · RF-04 · RF-06 · RF-07 · RF-10 · RF-11 (parcial). Escáner, venta básica, RLS, corte de caja y dashboard textual. |
| **Fase 2** | Optimización | RF-05 · RF-09 · RF-11 (completo). Inventario completo, gráficas Recharts, modo offline con IndexedDB y sincronización. |
| **Fase 3** | Valor Agregado | RF-08 · Ticket WhatsApp · Asistente de reabastecimiento · Modo Kiosko para verificación de precios. |

 

# **7\. Glosario**

| Tenant | Cada tienda que opera dentro del SaaS como una unidad de datos aislada. |
| :---- | :---- |
| **RLS (Row Level Security)** | Mecanismo de Supabase/PostgreSQL que restringe qué filas puede leer o modificar cada usuario según su identidad. |
| **PWA (Progressive Web App)** | Aplicación web que puede instalarse en el dispositivo y funcionar offline usando estándares web modernos. |
| **Fiado** | Modalidad de crédito informal en tiendas de abarrotes donde el cliente lleva productos y paga después. |
| **Soft Delete** | Eliminación lógica de registros: el dato no se borra físicamente de la base de datos, solo se marca como inactivo. |
| **HID (Human Interface Device)** | Protocolo que permite a lectores de código de barras físicos emular la entrada de un teclado estándar. |
| **IndexedDB** | Base de datos integrada en el navegador usada para almacenamiento local en el modo offline de la PWA. |
| **Ticket Promedio** | Valor promedio de compra por transacción, calculado como total\_ventas / número\_de\_ventas en un periodo. |
| **Encargado** | Perfil único de usuario del sistema. Persona de confianza (dueño o familiar) que opera la tienda y tiene acceso completo a todas las funciones. |
| **prefers-color-scheme** | Propiedad CSS/media query que detecta si el sistema operativo del dispositivo está configurado en modo claro u oscuro. |
| **data-theme** | Atributo HTML en el elemento raíz del DOM que controla qué set de variables CSS de color está activo (light/dark). |
| **Token de Diseño** | Variable CSS nombrada semánticamente (ej. \--brand-500) que centraliza un valor visual reutilizable en todo el sistema. |
| **Glow** | Efecto de sombra de color (box-shadow) aplicado a elementos activos para reforzar su estado sin cambiar su posición. |
| **Fat-Finger Design** | Principio de diseño móvil que garantiza que los elementos táctiles tengan al menos 44x44 puntos CSS para ser accionables con el pulgar. |
| **Fuente Única de Verdad** | Principio de arquitectura de diseño donde todos los valores visuales (colores, tipografía, espaciados) se definen en un solo lugar y se consumen en el resto del sistema. |

 


# Despertador App — Plan de Acción y Especificación Técnica (MVP)

> Documento maestro para Claude Code. Define stack, arquitectura, modelo de dominio,
> esquema de datos y un plan por etapas con criterios de aceptación.
> El MVP apunta exclusivamente a **Android**. iOS queda fuera de alcance del MVP.

---

## 1. Visión del producto

Una app de despertador (alarmas) donde, para **desactivar** una alarma que está sonando,
el usuario debe **completar una o más "actions" (retos) en orden**. La alarma solo se
silencia cuando se completan todas las actions configuradas.

### Flujo de usuario

1. El usuario instala la app (sin autenticación).
2. Crea una alarma configurando:
   - **Días** de la semana en que se activa.
   - **Hora y minuto**.
   - Una lista **ordenada** de **actions** que tendrá que completar para apagarla.
3. A la hora programada, la alarma suena en pantalla completa (incluso con la app cerrada).
4. El usuario completa cada action en orden; al terminar todas, la alarma se desactiva.

### Actions del MVP

- **BUTTON**: pulsar un botón para avanzar.
- **MATH**: resolver un cálculo. 4 niveles: `MINIMO`, `MEDIO`, `MAXIMO`, `EXTREMO`.
- **PUZZLE**: reordenar una imagen dividida en un grid. 3 niveles:
  - `MINIMO` → 6 piezas (grid 2×3)
  - `MEDIO` → 12 piezas (grid 3×4)
  - `MAXIMO` → 36 piezas (grid 6×6)
  - La imagen la sube el usuario; si no sube ninguna, se usa una imagen por defecto incluida en el bundle.

### Reglas de concatenación

- Una alarma tiene **N actions en orden** (`position`).
- **Se puede repetir el mismo tipo** varias veces (ej.: 4 MATH), y **cada instancia tiene su propio nivel**.
- La alarma se desactiva **solo** cuando todas las actions, en orden, quedan completadas.

---

## 2. Stack técnico (decisiones cerradas)

| Capa                       | Tecnología                                                       | Notas                                                                                                             |
| -------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Runtime                    | **React Native con Expo**                                        | **Development Builds** (prebuild/CNG). **No** Expo Go (Notifee y config plugins requieren build nativa).          |
| Lenguaje                   | TypeScript estricto                                              | `strict: true`, sin `any` implícitos.                                                                             |
| UI                         | **NativeWind v4** + **react-native-reusables**                   | NativeWind = Tailwind para RN. react-native-reusables = "shadcn para RN". Inicializar con su CLI.                 |
| Navegación                 | **expo-router**                                                  | File-based routing.                                                                                               |
| Persistencia               | **SQLite vía `expo-sqlite` + `drizzle-orm`**                     | Esquema tipado, mapeable a Postgres a futuro.                                                                     |
| Alarmas / notificaciones   | **`@notifee/react-native`**                                      | Trigger notifications (TIMESTAMP), canal con `AndroidImportance.HIGH` + sonido de alarma, **Full-Screen Intent**. |
| Sensores/hardware (futuro) | `expo-camera`, `expo-image-picker`, `expo-sensors`, `expo-audio` | Para PUZZLE (foto) ahora y "actions físicas" más adelante.                                                        |
| Animación/gestos           | `react-native-reanimated`, `react-native-gesture-handler`        | Requeridos por react-native-reusables y por el drag del puzzle.                                                   |
| Estado de UI               | `zustand`                                                        | Ligero. Solo estado de presentación; la lógica vive en use cases.                                                 |
| Tests                      | `jest` + `@testing-library/react-native`                         | Dominio y aplicación con TDD.                                                                                     |

---

## 3. Arquitectura (Hexagonal / Ports & Adapters)

Regla de oro: **el dominio y la aplicación no dependen de React Native, Expo ni SQLite.**
Toda dependencia externa entra por un **puerto** (interfaz) y se implementa en `infrastructure`.

### Preparada para backend futuro

El backend futuro será **solo un adaptador más**: una implementación `HttpAlarmRepository`
del puerto `AlarmRepository`, más un `SyncService`. **No se reescribe dominio ni use cases.**

### Estructura de carpetas

```
src/
  domain/
    alarm/
      Alarm.ts                 # Entidad raíz (aggregate)
      Schedule.ts              # VO: días + hora/minuto
      Action.ts                # VO base + variantes (Button/Math/Puzzle) + niveles
      AlarmSession.ts          # Entidad: estado del disparo y progreso de actions
      errors.ts                # Errores de dominio
    ports/
      AlarmRepository.ts
      NotificationScheduler.ts
      Clock.ts
      IdGenerator.ts
  application/
    use-cases/
      CreateAlarm.ts
      UpdateAlarm.ts
      DeleteAlarm.ts
      ListAlarms.ts
      ToggleAlarm.ts
      SyncAlarms.ts            # Reconstruye triggers del SO desde la DB
      StartAlarmSession.ts     # Al disparar: crea/recupera la sesión
      CompleteAction.ts        # Avanza la sesión; si termina -> dismiss
      DismissAlarm.ts
  infrastructure/
    persistence/
      drizzle/
        schema.ts
        client.ts
        migrations/
      SqliteAlarmRepository.ts
      SqliteAlarmSessionRepository.ts
    notifications/
      NotifeeNotificationScheduler.ts
    system/
      SystemClock.ts
      UuidGenerator.ts
    di/
      container.ts             # Wiring de puertos -> adaptadores
  presentation/
    screens/
      AlarmListScreen.tsx
      AlarmEditScreen.tsx
      RingingScreen.tsx        # Pantalla full-screen de la alarma activa
      actions/
        ButtonActionView.tsx
        MathActionView.tsx
        PuzzleActionView.tsx
    components/                # Reutilizables (basados en react-native-reusables)
    hooks/
      useAlarms.ts
      useAlarmSession.ts
    stores/
      sessionStore.ts          # zustand (estado de UI del reto activo)
  app/                         # expo-router (rutas)
```

---

## 4. Modelo de dominio

### Tipos base

```ts
type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = domingo
type MathLevel = "MINIMO" | "MEDIO" | "MAXIMO" | "EXTREMO";
type PuzzleLevel = "MINIMO" | "MEDIO" | "MAXIMO"; // 6 | 12 | 36 piezas
type ActionType = "BUTTON" | "MATH" | "PUZZLE";
```

### Schedule (Value Object)

- `days: Set<Weekday>` (al menos uno).
- `hour: 0..23`, `minute: 0..59`.
- Método `nextOccurrence(from: Date): Date` que calcula el próximo disparo.

### Action (Value Object, discriminado por `type`)

```ts
type ActionConfig =
  | { type: "BUTTON"; position: number }
  | { type: "MATH"; position: number; level: MathLevel }
  | {
      type: "PUZZLE";
      position: number;
      level: PuzzleLevel;
      imageUri: string | null;
    };
```

- `position` define el orden de concatenación (0-based, único dentro de la alarma).
- Se permite repetir `type`.

### Alarm (Aggregate Root)

- `id: string`
- `label: string`
- `schedule: Schedule`
- `enabled: boolean`
- `actions: ActionConfig[]` (ordenadas por `position`, al menos una)
- `createdAt`, `updatedAt`
- Invariantes: al menos un día, al menos una action, `position` consecutivos sin huecos.

### AlarmSession (Entidad)

Estado del disparo en curso. **Se persiste** para sobrevivir si matan la app a mitad del reto.

- `id`, `alarmId`, `firedAt`
- `currentIndex: number` (índice de la action en curso)
- `status: 'RINGING' | 'IN_PROGRESS' | 'DISMISSED'`
- Método `completeCurrent()` → avanza índice; si supera el último, pasa a `DISMISSED`.

---

## 5. Esquema de base de datos (Drizzle / SQLite)

```ts
// alarms
{
  id: text (pk),
  label: text,
  hour: integer,
  minute: integer,
  days: text,            // JSON array de Weekday, ej. "[1,2,3,4,5]"
  enabled: integer,      // 0 | 1
  created_at: integer,   // epoch ms
  updated_at: integer
}

// alarm_actions
{
  id: text (pk),
  alarm_id: text (fk -> alarms.id, on delete cascade),
  position: integer,
  type: text,            // 'BUTTON' | 'MATH' | 'PUZZLE'
  level: text,           // nullable: MathLevel | PuzzleLevel | null
  image_uri: text        // nullable, solo PUZZLE
}
// índice único (alarm_id, position)

// alarm_sessions
{
  id: text (pk),
  alarm_id: text (fk -> alarms.id),
  fired_at: integer,
  current_index: integer,
  status: text           // 'RINGING' | 'IN_PROGRESS' | 'DISMISSED'
}
```

---

## 6. Motor de alarma (lo más delicado — Android)

### Programación

- Cada alarma habilitada genera, por cada próxima ocurrencia, una **trigger notification** de Notifee
  (`TriggerType.TIMESTAMP`) con `alarmManager: { allowWhileIdle: true }`.
- Canal Android dedicado: `importance: AndroidImportance.HIGH`, sonido de alarma, `bypassDnd` si aplica.
- **Full-Screen Intent**: `fullScreenAction` apuntando a una activity que abre la app en `RingingScreen`,
  de modo que la pantalla se encienda y muestre el reto aunque la app esté cerrada.

### Permisos (pedirlos en onboarding)

- `SCHEDULE_EXACT_ALARM` (Android 12+) para alarmas exactas.
- `POST_NOTIFICATIONS` (Android 13+).
- `USE_FULL_SCREEN_INTENT`.
- `RECEIVE_BOOT_COMPLETED`.
- Sugerir al usuario excluir la app de la **optimización de batería** (Doze).

### Reprogramación robusta

- **Fuente de verdad = SQLite.**
- Caso de uso `SyncAlarms`: borra los triggers del SO y los reconstruye desde la DB.
- Se ejecuta: (a) al arrancar la app, (b) tras `BOOT_COMPLETED`, (c) tras crear/editar/borrar/toggle de cualquier alarma, (d) al desactivar una alarma para reprogramar la siguiente ocurrencia.

### Sesión y supervivencia

- Al dispararse, `StartAlarmSession` crea (o recupera si ya existía) la `AlarmSession` en estado `RINGING`.
- El sonido se reproduce en bucle hasta `DismissAlarm`.
- `CompleteAction` persiste el avance tras cada reto; si matan la app, al reabrir se retoma desde `current_index`.

---

## 7. Especificación de las actions

### BUTTON

- Vista con un botón grande "Estoy despierto". Al pulsarlo, `CompleteAction`.

### MATH (4 niveles)

Generador puro y testeable. El nivel define rango/operaciones:

- `MINIMO`: suma/resta, 1 dígito.
- `MEDIO`: suma/resta/multiplicación, 2 dígitos.
- `MAXIMO`: multiplicación/división, 2–3 dígitos.
- `EXTREMO`: expresiones de 2 operadores con precedencia, 2–3 dígitos.
- El usuario introduce la respuesta; debe ser exacta para completar.

### PUZZLE (3 niveles)

- El usuario sube una imagen (`expo-image-picker`); si no, imagen por defecto del bundle.
- La imagen se divide en grid según nivel: `MINIMO` 2×3 (6), `MEDIO` 3×4 (12), `MAXIMO` 6×6 (36).
- Las piezas se barajan; el usuario **arrastra para intercambiar** dos piezas hasta reconstruir la imagen.
- Se completa cuando todas las piezas están en su posición original.
- Implementación: `react-native-reanimated` + `gesture-handler`; cada pieza es un crop de la imagen mostrado con offsets.

---

## 8. Plan por etapas (TDD obligatorio en dominio y aplicación)

> Regla TDD: para dominio y casos de uso, **test primero**. Cada etapa termina con la suite en verde.
> Cada etapa es un commit/branch coherente y desplegable a un dev build.

### Etapa 0 — Setup

- Inicializar proyecto Expo + dev build, TypeScript estricto, ESLint/Prettier.
- Configurar NativeWind v4 e inicializar react-native-reusables (instalar 2–3 componentes base: Button, Card, Text).
- Instalar y configurar expo-router, jest + testing-library.
- Estructura de carpetas hexagonal vacía + `container.ts` (DI) básico.
- **Aceptación**: la app arranca en un dispositivo Android real y renderiza un `<Button>` de react-native-reusables con estilos NativeWind.

### Etapa 1 — Dominio + persistencia (sin UI de disparo)

- Implementar `Schedule`, `Action`, `Alarm`, `AlarmSession` con sus invariantes (tests primero).
- Esquema Drizzle + migraciones; `SqliteAlarmRepository` y `SqliteAlarmSessionRepository`.
- Use cases CRUD: `CreateAlarm`, `UpdateAlarm`, `DeleteAlarm`, `ListAlarms`, `ToggleAlarm`.
- **Aceptación**: tests verdes de dominio/aplicación; un test de integración crea/lee/edita/borra alarmas en SQLite y persisten entre reinicios del proceso.

### Etapa 2 — UI de gestión de alarmas

- `AlarmListScreen`: lista, toggle on/off, navegar a editar/crear, eliminar.
- `AlarmEditScreen`: selector de días, time picker (hora/minuto), editor de la lista de actions
  con **reordenamiento** y selección de tipo + nivel por action (incluye repetir tipos).
- Subida de imagen para PUZZLE.
- **Aceptación**: se puede crear/editar/borrar alarmas completas desde la UI y persisten. Aún no suenan.

### Etapa 3 — Motor de disparo (Notifee)

- `NotifeeNotificationScheduler` (implementa puerto `NotificationScheduler`): canal de alarma, trigger TIMESTAMP, full-screen intent.
- `SyncAlarms` + ejecución en arranque y tras `BOOT_COMPLETED`.
- Solicitud de permisos en onboarding.
- `RingingScreen` mínima (sin retos aún) que abre a pantalla completa y suena en bucle; botón temporal para detener.
- **Aceptación**: una alarma programada suena y abre `RingingScreen` a la hora correcta **con la app cerrada**, y se reprograma tras reinicio del teléfono.

### Etapa 4 — Actions y concatenación (el corazón del producto)

- `StartAlarmSession`, `CompleteAction`, `DismissAlarm` (tests primero).
- Vistas `ButtonActionView`, `MathActionView` (4 niveles), `PuzzleActionView` (3 niveles).
- `RingingScreen` recorre las actions por `position`; al completar la última, `DismissAlarm` detiene sonido y reprograma la siguiente ocurrencia.
- Persistencia del progreso (`current_index`) para sobrevivir cierre de app.
- **Aceptación**: flujo end-to-end completo — la alarma suena, exige todos los retos en orden (incluyendo repetidos con niveles propios) y solo se apaga al completarlos todos.

### Etapa 5 — Pulido del MVP

- Dark mode, estados vacíos, manejo de permisos denegados, exención de batería.
- Recuperación de sesión interrumpida al reabrir.
- (Opcional) snooze — decidir si entra al MVP.
- **Aceptación**: app estable y usable en un dispositivo real durante varios días de uso.

### Etapa 6 — Preparación de backend (post-MVP, no construir aún)

- Definir `HttpAlarmRepository` (stub) y `SyncService` contra el mismo puerto, demostrando que el dominio no cambia.

---

## 9. Convenciones

- **TDD** en `domain/` y `application/`. Infraestructura: tests de integración donde aporte valor.
- Sin lógica de negocio en componentes RN: los componentes llaman a use cases vía hooks.
- Errores de dominio explícitos (no excepciones genéricas) en `domain/alarm/errors.ts`.
- Commits pequeños por etapa; cada etapa deja la suite verde y la app ejecutable.
- Nombres de identificadores en inglés; comentarios pueden ir en español.

## 10. Fuera de alcance del MVP

- iOS (limitaciones del SO para alarmas con app cerrada; se evaluará después).
- Autenticación y backend (solo se deja la arquitectura preparada).
- Actions "físicas" con cámara/sensores/micrófono (diseño preparado, implementación posterior).
- Snooze (a decidir).

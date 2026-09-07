# Skill: UI Design System (Padrões de Interface, Dark Mode & Acessibilidade)

Esta skill define os componentes canônicos, paleta de cores e regras de ergonomia visual para o Frontend (React 19 + Tailwind CSS).

## 1. Paleta de Cores e Contraste Obrigatório
Todos os elementos visuais devem suportar **Modo Claro** e **Modo Escuro** sem exceção:

| Elemento | Modo Claro | Modo Escuro (`dark:`) |
| :--- | :--- | :--- |
| **Fundo da Página** | `bg-zinc-50` | `dark:bg-zinc-950` |
| **Superfície / Card** | `bg-white` | `dark:bg-zinc-900` |
| **Bordas** | `border-zinc-200` | `dark:border-zinc-800` |
| **Texto Primário** | `text-zinc-900` | `dark:text-zinc-100` |
| **Texto Secundário** | `text-zinc-500` | `dark:text-zinc-400` |
| **Input / Select** | `bg-white border-zinc-300 text-zinc-900` | `dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100` |

## 2. Componentes e Padrões Canônicos

### 2.1 Botões
- **Primário**:
  ```tsx
  <button className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 disabled:opacity-50">
  ```
- **Secundário**:
  ```tsx
  <button className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors">
  ```
- **Perigo**:
  ```tsx
  <button className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors">
  ```

### 2.2 Badges de Status
- **Pendente**:
  `bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800`
- **Concluído**:
  `bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800`
- **Em Andamento**:
  `bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200 dark:border-blue-800`

### 2.3 Skeletons e Estados de Carregamento
Nunca deixe telas em branco durante requisições. Utilize `Loader2` girando ou blocos com `animate-pulse`:
```tsx
<div className="animate-pulse space-y-4">
  <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-1/4"></div>
  <div className="h-24 bg-zinc-200 dark:bg-zinc-800 rounded-xl"></div>
</div>
```

### 2.4 Modais
Sempre envolva conteúdos modais no componente padrão `frontend/src/components/Modal.tsx`, que implementa:
- Bloqueio de scroll do body.
- Fechamento ao pressionar a tecla `ESC`.
- Fechamento ao clicar no backdrop escurecido com blur (`bg-black/50 backdrop-blur-sm`).

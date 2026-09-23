import React, { useState } from "react";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Expenses } from "./pages/Expenses";
import { Commitments } from "./pages/Commitments";
import { Calendar } from "./pages/Calendar";
import { Settings } from "./pages/Settings";
import { Layout } from "./components/Layout";
import { NavTab } from "./types";
import { Loader2 } from "lucide-react";
import "./App.css";

const MainApp: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavTab>("inicio");

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
        <div className="flex flex-col items-center space-y-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Carregando Wallet...
          </span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <Layout currentTab={currentTab} onSelectTab={setCurrentTab}>
      {currentTab === "inicio" && (
        <Dashboard
          onNavigateToRegistros={() => setCurrentTab("registros")}
          onOpenNewExpenseModal={() => setCurrentTab("registros")}
        />
      )}
      {currentTab === "registros" && <Expenses />}
      {currentTab === "calendario" && (
        <Calendar
          onOpenNewExpenseModal={() => setCurrentTab("registros")}
        />
      )}
      {currentTab === "compromissos" && (
        <Commitments
          onOpenNewExpenseModal={() => setCurrentTab("registros")}
        />
      )}
      {currentTab === "configuracoes" && <Settings />}
    </Layout>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;

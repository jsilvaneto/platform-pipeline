import React, { useState } from "react";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Expenses } from "./pages/Expenses";
import { Categories } from "./pages/Categories";
import { Layout } from "./components/Layout";
import { NavTab } from "./components/Header";
import { Loader2 } from "lucide-react";
import "./App.css";

const MainApp: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavTab>("dashboard");
  const [isExpenseModalRequested, setIsExpenseModalRequested] = useState<boolean>(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
        <div className="flex flex-col items-center space-y-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
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
      {currentTab === "dashboard" && (
        <Dashboard
          onNavigateToExpenses={() => setCurrentTab("expenses")}
          onOpenNewExpenseModal={() => {
            setCurrentTab("expenses");
            setIsExpenseModalRequested(true);
          }}
        />
      )}
      {currentTab === "expenses" && (
        <Expenses
          isCreateModalOpenExternal={isExpenseModalRequested}
          onCloseCreateModalExternal={() => setIsExpenseModalRequested(false)}
        />
      )}
      {currentTab === "categories" && <Categories />}
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

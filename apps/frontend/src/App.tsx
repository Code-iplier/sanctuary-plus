import React, { useState } from 'react';
import { Button, Badge, Drawer, Card, Toast } from '@heroui/react';
import {
  LayoutDashboard,
  Users,
  Pill,
  Shield,
  Heart,
  Menu,
  RadioTower,
} from 'lucide-react';
import QueuePage from './pages/QueuePage';
import DocumentationPage from './pages/DocumentationPage';
import MedicationsPage from './pages/MedicationsPage';
import WardSyncPage from './pages/WardSyncPage';
import ChronosPage from './pages/ChronosPage';
import DashboardPage from './pages/DashboardPage';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'queue', label: 'Queue', icon: Users },
  { id: 'documentation', label: 'Documentation', icon: Pill },
  { id: 'medications', label: 'Medications', icon: Shield },
  { id: 'wardsync', label: 'WardSync', icon: RadioTower },
  { id: 'chronos', label: 'Chronos ICU', icon: Heart },
] as const;

export default function App() {
  const [activePanel, setActivePanel] = useState<
    | 'dashboard'
    | 'queue'
    | 'documentation'
    | 'medications'
    | 'wardsync'
    | 'chronos'
  >('dashboard');

  const renderPanel = () => {
    switch (activePanel) {
      case 'dashboard':
        return <DashboardPage onNavigate={setActivePanel} />;
      case 'queue':
        return <QueuePage />;
      case 'documentation':
        return <DocumentationPage />;
      case 'medications':
        return <MedicationsPage />;
      case 'wardsync':
        return <WardSyncPage />;
      case 'chronos':
        return <ChronosPage />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-6 bg-white text-gray-900">
      <div className="mx-auto max-w-6xl flex flex-col gap-4">
        {/* Header */}
        <Card className="p-4 flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <Drawer>
              <Drawer.Trigger>
                <Button isIconOnly variant="ghost" aria-label="Open menu">
                  <Menu size={18} />
                </Button>
              </Drawer.Trigger>
              <Drawer.Content>
                <Drawer.Header>
                  <span className="text-lg font-semibold">Menu</span>
                </Drawer.Header>
                <Drawer.Body className="flex flex-col gap-2">
                  {NAV_ITEMS.map((item) => (
                    <Button
                      key={item.id}
                      variant={activePanel === item.id ? 'primary' : 'ghost'}
                      onPress={() => setActivePanel(item.id)}
                      className="justify-start"
                    >
                      <item.icon size={16} />
                      {item.label}
                    </Button>
                  ))}
                </Drawer.Body>
              </Drawer.Content>
            </Drawer>
            <div>
              <h1 className="text-xl md:text-2xl font-semibold">
                Hospital Platform
              </h1>
              <p className="text-sm text-gray-500">
                AI-Powered Healthcare System
              </p>
            </div>
          </div>
          <Badge color="accent" variant="soft">
            v1.0.0
          </Badge>
        </Card>

        {/* Top navigation */}
        <div className="flex flex-wrap gap-2">
          {NAV_ITEMS.map((item) => (
            <Button
              key={item.id}
              variant={activePanel === item.id ? 'primary' : 'outline'}
              onPress={() => setActivePanel(item.id)}
            >
              <item.icon size={16} />
              {item.label}
            </Button>
          ))}
        </div>

        {/* Active panel */}
        <div>{renderPanel()}</div>

        <Toast.Provider />
      </div>
    </div>
  );
}

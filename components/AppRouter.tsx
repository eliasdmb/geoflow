// components/AppRouter.tsx
import React from 'react';
import { ViewState, Project, Client, RuralProperty, Professional, Service, Registry, SigefCertification, BudgetItemTemplate, FinancialTransaction, Appointment, CreditCard, CreditCardExpense, ProjectStatus, Account, WorkflowStepId } from '../types';
import { WORKFLOW_STEPS_DEFINITION, CAR_WORKFLOW_STEPS_DEFINITION } from '../constants';
import { supabase } from '../lib/supabase';
import Dashboard from './Dashboard';
import ProjectManagement from './ProjectManagement';
import ProjectWorkflow from './ProjectWorkflow';
import ClientList from './ClientList';
import PropertyList from './PropertyList';
import ProfessionalList from './ProfessionalList';
import RegistryList from './RegistryList';
import ServiceList from './ServiceList';
import BudgetItemTemplateList from './BudgetItemTemplateList';
import SigefCertificationList from './SigefCertificationList';
import FinancialModule from './FinancialModule';
import CalendarView from './CalendarView';
import FinancialReport from './FinancialReport';
import ProtectedRoute from './ProtectedRoute';
import ProfileSettings from './ProfileSettings';

interface AppRouterProps {
  currentView: ViewState;
  setCurrentView: (view: ViewState) => void;
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  projects: Project[];
  clients: Client[];
  properties: RuralProperty[];
  professionals: Professional[];
  registries: Registry[];
  sigefCertifications: SigefCertification[];
  services: Service[];
  budgetItemTemplates: BudgetItemTemplate[];
  transactions: FinancialTransaction[];
  appointments: Appointment[];
  creditCards: CreditCard[];
  creditCardExpenses: CreditCardExpense[];
  accounts: Account[];
  user: any;
  profile: any;
  role: string | null;
  fetchInitialData: (uid: string) => Promise<void>;
  showNotification: (message: any, type?: 'success' | 'error' | 'info' | 'whatsapp' | 'alert') => void;
  simulateProgress: (duration?: number) => () => void;
  userIdRef: React.MutableRefObject<string | null>;
  addProject: (
    title: string,
    clientId: string,
    propertyId: string,
    professionalId: string,
    serviceId: string,
    registryId: string,
    deadline?: string,
    certificationNumber?: string,
    certificationDate?: string,
    artNumber?: string
  ) => Promise<boolean>;
  handleUpsert: (table: string, data: any, fetchFn: (uid: string) => Promise<any>, id?: string) => Promise<void>;
  handleDelete: (table: string, id: string) => Promise<void>;
  updateProjectStep: (stepDbId: string, projectId: string, newStatus: ProjectStatus, notes?: string, document_number?: string) => Promise<void>;
  handleSaveAccount: (account: Partial<Account>, id?: string) => Promise<void>;
}

const AppRouter: React.FC<AppRouterProps> = ({
  currentView,
  setCurrentView,
  selectedProjectId,
  setSelectedProjectId,
  projects,
  clients,
  properties,
  professionals,
  registries,
  sigefCertifications,
  services,
  budgetItemTemplates,
  transactions,
  appointments,
  creditCards,
  creditCardExpenses,
  accounts,
  user,
  profile,
  role,
  fetchInitialData,
  showNotification,
  simulateProgress,
  userIdRef,
  addProject,
  handleUpsert,
  handleDelete,
  updateProjectStep,
  handleSaveAccount,
}) => {
  const currentProject = projects.find(p => p.id === selectedProjectId);

  const renderView = () => {
    switch (currentView) {
      case 'DASHBOARD': return <Dashboard
        projects={projects}
        appointments={appointments}
        clients={clients}
        transactions={transactions}
        userName={profile?.name || user?.user_metadata?.full_name || user?.user_metadata?.name || (user?.email?.split('@')[0] ? user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1) : 'Usuário')}
        onProjectSelect={(id) => { setSelectedProjectId(id); setCurrentView('PROJECT_DETAILS'); }}
      />;
      case 'PROJECTS': return <ProjectManagement projects={projects} clients={clients} properties={properties} professionals={professionals} services={services} registries={registries} onAddProject={(t, c, p, prof, s, r, d, cert, certDate, artNum) => addProject(t, c, p, prof, s, r, d, cert, certDate, artNum)} onSelectProject={(id) => { setSelectedProjectId(id); setCurrentView('PROJECT_DETAILS'); }} onUpdateProject={(p, id) => handleUpsert('projects', p, fetchInitialData, id)} onDeleteProject={(id) => handleDelete('projects', id)} />;
      case 'FINANCIAL': return <ProtectedRoute requiredRole="admin">
        <FinancialModule
          transactions={transactions}
          projects={projects}
          creditCards={creditCards}
          creditCardExpenses={creditCardExpenses}
          accounts={accounts}
          onSaveTransaction={(t, id) => handleUpsert('financial_transactions', t, fetchInitialData, id)}
          onDeleteTransaction={(id) => handleDelete('financial_transactions', id)}
          onSaveCreditCard={(c, id) => handleUpsert('credit_cards', c, fetchInitialData, id)}
          onDeleteCreditCard={(id) => handleDelete('credit_cards', id)}
          onSaveCreditCardExpense={(e, id) => handleUpsert('credit_card_expenses', e, fetchInitialData, id)}
          onDeleteCreditCardExpense={(id) => handleDelete('credit_card_expenses', id)}
          onSaveAccount={handleSaveAccount}
          onDeleteAccount={(id) => handleDelete('accounts', id)}
        />
      </ProtectedRoute>;
      case 'PROJECT_DETAILS': return currentProject ? (
        <ProjectWorkflow
          project={currentProject}
          client={clients.find(c => c.id === currentProject.client_id)!}
          property={properties.find(prop => prop.id === currentProject.property_id)!}
          professional={professionals.find(prof => prof.id === currentProject.professional_id)!}
          service={services.find(s => s.id === currentProject.service_id) || services[0]}
          allProjects={projects}
          allClients={clients}
          allProperties={properties}
          allProfessionals={professionals}
          allServices={services}
          allRegistries={registries}
          certifications={sigefCertifications}
          budgetItemTemplates={budgetItemTemplates}
          userName={user?.user_metadata?.name || user?.email?.split('@')[0]}
          onUpdateStep={(stepDbId, status, notes, docNum) => updateProjectStep(stepDbId, currentProject.id, status, notes, docNum)}
          onInitSteps={async () => {
            const uid = userIdRef.current;
            if (!uid) return false;
            try {
              const service = services.find(s => s.id === currentProject.service_id);
              const isCarGo = service?.name?.toUpperCase().includes('CAR');

              let stepsToCreate = WORKFLOW_STEPS_DEFINITION;
              if (isCarGo) {
                stepsToCreate = CAR_WORKFLOW_STEPS_DEFINITION;
              }

              await supabase.from('project_steps').delete().eq('project_id', currentProject.id);
              const steps = stepsToCreate.map((s, i) => ({
                project_id: currentProject.id,
                step_id: s.id,
                label: s.label,
                has_document: s.hasDocument,
                status: i === 0 ? ProjectStatus.IN_PROGRESS : ProjectStatus.NOT_STARTED,
                user_id: uid
              }));

              await supabase.from('project_steps').insert(steps);
              fetchInitialData(uid);
              return true;
            } catch (e) { return false; }
          }}
          onBack={() => setCurrentView('PROJECTS')}
          isAdmin={role === 'admin'}
          onCreateTransaction={(t) => handleUpsert('financial_transactions', t, fetchInitialData)}
        />
      ) : <div className="p-8 text-center text-slate-500 italic">Carregando detalhes...</div>;
      case 'CLIENTS': return <ClientList clients={clients} onSaveClient={(c, id) => handleUpsert('clients', c, fetchInitialData, id)} onDeleteClient={(id) => handleDelete('clients', id)} />;
      case 'PROPERTIES': return <PropertyList properties={properties} clients={clients} onSaveProperty={(p, id) => handleUpsert('properties', p, fetchInitialData, id)} onDeleteProperty={(id) => handleDelete('properties', id)} />;
      case 'PROFESSIONALS': return <ProfessionalList professionals={professionals} onSaveProfessional={(p, id) => handleUpsert('professionals', p, fetchInitialData, id)} onDeleteProfessional={(id) => handleDelete('professionals', id)} />;
      case 'REGISTRIES': return <RegistryList registries={registries} onSaveRegistry={(r, id) => handleUpsert('registries', r, fetchInitialData, id)} onDeleteRegistry={(id) => handleDelete('registries', id)} />;
      case 'SERVICES': return <ServiceList services={services} onSaveService={(s, id) => handleUpsert('services', s, fetchInitialData, id)} onDeleteService={(id) => handleDelete('services', id)} />;
      case 'BUDGET_TEMPLATES': return <BudgetItemTemplateList templates={budgetItemTemplates} onSaveTemplate={(t, id) => handleUpsert('budget_templates', t, fetchInitialData, id)} onDeleteTemplate={(id) => handleDelete('budget_templates', id)} />;
      case 'SIGEF_CERTIFICATIONS': return <SigefCertificationList certifications={sigefCertifications} onSaveCertification={(c, id) => handleUpsert('sigef_certifications', c, fetchInitialData, id)} onDeleteCertification={(id) => handleDelete('sigef_certifications', id)} />;
      case 'FINANCIAL_REPORT': return <FinancialReport transactions={transactions} projects={projects} />;
      case 'CALENDAR': return <CalendarView
        appointments={appointments}
        clients={clients}
        projects={projects}
        onSaveAppointment={(a, id) => handleUpsert('appointments', a, fetchInitialData, id)}
        onDeleteAppointment={(id) => handleDelete('appointments', id)}
      />;
      case 'PROFILE': return <ProfileSettings />;
      default: return <Dashboard
        projects={projects}
        appointments={appointments}
        clients={clients}
        transactions={transactions}
        userName={user?.user_metadata?.name || user?.email?.split('@')[0]}
        onProjectSelect={(id) => { setSelectedProjectId(id); setCurrentView('PROJECT_DETAILS'); }}
      />;
    }
  };

  return (
    <div key={currentView} className="w-full min-h-full">
      {renderView()}
    </div>
  );
};

export default AppRouter;

import React from 'react';
import type { ProtaTabProps } from './components/prota/types';
import {
  useProtaTabState,
  ProtaValidationSummary,
  ProtaToolbar,
  ProtaItemFormDrawer,
  ProtaItemsView,
} from './components/prota';

export type { ProtaTabProps } from './components/prota/types';

export const ProtaTab: React.FC<ProtaTabProps> = (props) => {
  const {
    items,
    onAddItem,
    onUpdateItem,
    onDeleteItem,
    onMoveItem,
    onSwapSemester,
    onLoadSampleData,
    onOpenWizard,
    onAutoBalance,
    onFillWithAi,
    onCreateModulAjar,
    isAiBusy = false,
    curriculum,
    onChangeCurriculum,
    validation,
    rmeSem1,
    rmeSem2,
  } = props;

  const {
    activeSemFilter,
    setActiveSemFilter,
    isAdding,
    setIsAdding,
    editingId,
    formData,
    setFormData,
    resetForm,
    handleStartEdit,
    handleSubmit,
    filteredItems,
    isFirstInSemester,
    isLastInSemester,
    sem1Badge,
    sem2Badge,
    annualBadge,
    hasDiscrepancy,
    isDeficit,
    discrepancyTitle,
    discrepancyDesc,
  } = useProtaTabState({
    items,
    validation,
    onAddItem,
    onUpdateItem,
  });

  return (
    <div className="space-y-6">
      {/* 1. Real-Time Balance Validation Bar */}
      <ProtaValidationSummary
        validation={validation}
        rmeSem1={rmeSem1}
        rmeSem2={rmeSem2}
        sem1Badge={sem1Badge}
        sem2Badge={sem2Badge}
        annualBadge={annualBadge}
        hasDiscrepancy={hasDiscrepancy}
        isDeficit={isDeficit}
        discrepancyTitle={discrepancyTitle}
        discrepancyDesc={discrepancyDesc}
        onAutoBalance={onAutoBalance}
      />

      {/* 2. Controls Toolbar & Curriculum Selector */}
      <ProtaToolbar
        curriculum={curriculum}
        onChangeCurriculum={onChangeCurriculum}
        itemsCount={items.length}
        hasDiscrepancy={hasDiscrepancy}
        onOpenWizard={onOpenWizard}
        onAutoBalance={onAutoBalance}
        onFillWithAi={onFillWithAi}
        isAiBusy={isAiBusy}
        onLoadSampleData={onLoadSampleData}
        onToggleAdding={() => {
          resetForm();
          setIsAdding(!isAdding);
        }}
      />

      {/* 3. Add/Edit Form Drawer */}
      <ProtaItemFormDrawer
        isAdding={isAdding}
        editingId={editingId}
        curriculum={curriculum}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSubmit}
        onCancel={resetForm}
      />

      {/* 4. Prota Items Table / Responsive Cards */}
      <ProtaItemsView
        items={items}
        filteredItems={filteredItems}
        activeSemFilter={activeSemFilter}
        setActiveSemFilter={setActiveSemFilter}
        curriculum={curriculum}
        onOpenWizard={onOpenWizard}
        isFirstInSemester={isFirstInSemester}
        isLastInSemester={isLastInSemester}
        onMoveItem={onMoveItem}
        onSwapSemester={onSwapSemester}
        onCreateModulAjar={onCreateModulAjar}
        onStartEdit={handleStartEdit}
        onDeleteItem={onDeleteItem}
      />
    </div>
  );
};

export default ProtaTab;

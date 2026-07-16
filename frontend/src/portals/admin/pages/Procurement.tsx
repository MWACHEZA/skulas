import ProcurementUI from '../../../components/portals/shared/ProcurementUI';

export default function AdminProcurement() {
  return (
    <>
      <div className="portal-page-header">
        <h1>Procurement Management</h1>
        <p>Review requisitions and manage school-wide purchase orders with multi-stage department approval.</p>
      </div>

      <ProcurementUI mode="FULL" />
    </>
  );
}


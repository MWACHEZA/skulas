import ProcurementUI from '../../../components/portals/shared/ProcurementUI';

export default function BursarProcurement() {
  return (
    <>
      <div className="portal-page-header">
        <h1>Financial Procurement Review</h1>
        <p>Review and verify departmental requisitions for budget compliance before final administrative approval.</p>
      </div>

      <ProcurementUI mode="FULL" />
    </>
  );
}


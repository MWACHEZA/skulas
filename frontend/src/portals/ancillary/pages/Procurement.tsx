import ProcurementUI from '../../../components/portals/shared/ProcurementUI';

export default function AncillaryProcurement() {
  return (
    <>
      <div className="portal-page-header">
        <h1>Procurement Requests</h1>
        <p>Submit and track procurement requisitions for your specific department or operations unit.</p>
      </div>

      <ProcurementUI mode="FULL" />
    </>
  );
}


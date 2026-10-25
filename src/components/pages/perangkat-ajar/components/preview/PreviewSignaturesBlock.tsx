import React from 'react';
import type { DocumentIdentity } from '../../../../../types/perangkatAjar';

interface PreviewSignaturesBlockProps {
  identity: DocumentIdentity;
}

export const PreviewSignaturesBlock: React.FC<PreviewSignaturesBlockProps> = ({
  identity,
}) => {
  return (
    <div className="flex justify-between items-start text-xs pt-3 mt-3 w-full break-inside-avoid">
      <div className="text-left space-y-0.5">
        <p>Mengetahui,</p>
        <p>{identity.principalRole || 'Kepala Madrasah'}</p>
        <div className="h-10" />
        <p className="font-bold underline">{identity.principalName || 'H. Masturi, S.Pd.I.'}</p>
        <p>{identity.principalNip && identity.principalNip !== '-' ? `NIP. ${identity.principalNip}` : 'NIP. -'}</p>
      </div>

      <div className="text-left space-y-0.5">
        <p>
          {identity.city || 'Madiun'}, {identity.signatureDate || new Date().toLocaleDateString('id-ID')}
        </p>
        <p>{identity.teacherRole || 'Guru Mata Pelajaran'}</p>
        <div className="h-10" />
        <p className="font-bold underline">{identity.teacherName || 'Bagas Riyadi, S.Pd'}</p>
        <p>{identity.teacherNip && identity.teacherNip !== '-' ? `NIP. ${identity.teacherNip}` : 'NIP. -'}</p>
      </div>
    </div>
  );
};

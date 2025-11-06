import { useMemo } from 'react';
import { useSession } from './useSession';

export function usePermissions() {
  const { account, storeId } = useSession();

  const permissions = useMemo(() => {
    if (!account) {
      return {
        canAccessSuper: false,
        canManageStore: false,
        canManageStaff: false,
        canViewReservations: false,
        canEditReservations: false,
        canViewPrepay: false,
        canChargePrepay: false,
        canDeductPrepay: false,
        canViewHR: false,
        canApproveHR: false,
        canViewBackup: false,
        canRestoreBackup: false,
      };
    }

    const role = account.role;
    const isSuperAdmin = role === 'superAdmin';
    const isStoreAdmin = role === 'storeAdmin';
    const isStaff = role === 'staff';

    return {
      // Super Admin 권한
      canAccessSuper: isSuperAdmin,
      canRestoreBackup: isSuperAdmin,
      
      // Store Admin 권한
      canManageStore: isSuperAdmin || isStoreAdmin,
      canManageStaff: isSuperAdmin || isStoreAdmin,
      canViewBackup: isSuperAdmin || isStoreAdmin,
      
      // 예약 관리
      canViewReservations: true,
      canEditReservations: isSuperAdmin || isStoreAdmin || isStaff,
      
      // 선결제 관리
      canViewPrepay: true,
      canChargePrepay: isSuperAdmin || isStoreAdmin || isStaff, // 사원도 충전 가능
      canDeductPrepay: isSuperAdmin || isStoreAdmin || isStaff, // 사원도 차감 가능
      
      // HR 모듈
      canViewHR: true,
      canApproveHR: isSuperAdmin || isStoreAdmin,
      canSignContract: isSuperAdmin || isStoreAdmin,
      
      // 현재 스토어 ID
      currentStoreId: storeId || account.storeId,
      
      // 역할 정보
      role,
      isSuperAdmin,
      isStoreAdmin,
      isStaff,
    };
  }, [account, storeId]);

  return permissions;
}


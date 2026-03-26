import { useQuery } from '@tanstack/react-query'

import { getSubscriptionStatus } from '../api/subscriptionApi'
import useAuthStore from '../store/authStore'

const useSubscription = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  const query = useQuery({
    queryKey: ['subscription-status'],
    enabled: isAuthenticated,
    queryFn: async () => {
      const response = await getSubscriptionStatus()
      return response.data
    },
  })

  const statusData = query.data || {}

  return {
    isSubscriber: Boolean(statusData.is_subscriber),
    subscriptionStatus: statusData.subscription_status || 'inactive',
    subscriptionPlan: statusData.subscription_plan || null,
    subscriptionEndDate: statusData.subscription_end_date || null,
    isLoading: query.isLoading,
  }
}

export default useSubscription

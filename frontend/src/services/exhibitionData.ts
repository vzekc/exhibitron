// src/utils/fetchExhibitionData.ts
import { gql } from '@apollo/client'
import client from '../apolloClient'

export const fetchExhibitionData = async () => {
  const { data } = await client.query({
    query: gql`
        query GetExhibition {
    }
    `
  })
  if (data && data.exhibitionData) {
    const { freeTables, items: exhibits } = data.exhibitionData
    return {
      exhibits,
      freeTables
    }
  }
}

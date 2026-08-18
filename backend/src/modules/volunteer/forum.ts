import axios from 'axios'
import { logger } from '../../app/logger.js'

/*
 * Whether a name belongs to somebody in the forum.
 *
 * A forum member helping out signs in through Woltlab rather than making a
 * second identity here, so a name that is taken there is refused here. Only
 * the forum knows its own member list, which is what this asks.
 *
 * With no endpoint configured, or with the forum not answering, the local
 * check in `identity.ts` stands alone: an outage on the other side must not
 * keep a volunteer from signing up.
 */
export const isForumNickname = async (nickname: string) => {
  const { FORUM_NICKNAME_API_URL, FORUM_API_TOKEN } = process.env
  if (!FORUM_NICKNAME_API_URL) return false

  try {
    const response = await axios.get(FORUM_NICKNAME_API_URL, {
      params: { nickname },
      headers: FORUM_API_TOKEN ? { Authorization: `Bearer ${FORUM_API_TOKEN}` } : {},
      timeout: 5_000,
    })
    return !!response.data?.exists
  } catch (error) {
    logger.warn({ error, nickname }, 'the forum did not answer whether the name is taken')
    return false
  }
}

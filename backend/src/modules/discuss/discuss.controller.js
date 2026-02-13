import * as discussService from "./discuss.service.js";

/* =====================================================
   CHANNEL CONTROLLERS
===================================================== */

export const createChannel = async (req, res, next) => {
  try {
    const result = await discussService.createChannel(
      req.user.companyId,
      req.user.empId,
      req.body
    );
    res.status(201).json(result);
  } catch (error) { next(error); }
};

export const getMyChannels = async (req, res, next) => {
  try {
    const channels = await discussService.getMyChannels(req.user.companyId, req.user.empId);
    res.json(channels);
  } catch (error) { next(error); }
};

export const browseChannels = async (req, res, next) => {
  try {
    const channels = await discussService.browseChannels(req.user.companyId);
    res.json(channels);
  } catch (error) { next(error); }
};

export const getChannel = async (req, res, next) => {
  try {
    const channel = await discussService.getChannel(
      parseInt(req.params.channelId),
      req.user.empId
    );
    res.json(channel);
  } catch (error) { next(error); }
};

export const updateChannel = async (req, res, next) => {
  try {
    await discussService.updateChannel(
      parseInt(req.params.channelId),
      req.user.empId,
      req.body
    );
    res.json({ message: "Channel updated" });
  } catch (error) { next(error); }
};

export const deleteChannel = async (req, res, next) => {
  try {
    await discussService.deleteChannel(parseInt(req.params.channelId), req.user.empId);
    res.json({ message: "Channel deleted" });
  } catch (error) { next(error); }
};

/* =====================================================
   MEMBER CONTROLLERS
===================================================== */

export const joinChannel = async (req, res, next) => {
  try {
    await discussService.joinChannel(parseInt(req.params.channelId), req.user.empId);
    res.json({ message: "Joined channel" });
  } catch (error) { next(error); }
};

export const leaveChannel = async (req, res, next) => {
  try {
    await discussService.leaveChannel(parseInt(req.params.channelId), req.user.empId);
    res.json({ message: "Left channel" });
  } catch (error) { next(error); }
};

export const getMembers = async (req, res, next) => {
  try {
    const members = await discussService.getMembers(parseInt(req.params.channelId));
    res.json(members);
  } catch (error) { next(error); }
};

export const markRead = async (req, res, next) => {
  try {
    await discussService.markRead(parseInt(req.params.channelId), req.user.empId);
    res.json({ message: "Read cursor updated" });
  } catch (error) { next(error); }
};

/* =====================================================
   MESSAGE CONTROLLERS
===================================================== */

export const sendMessage = async (req, res, next) => {
  try {
    const message = await discussService.sendMessage(
      parseInt(req.params.channelId),
      req.user.empId,
      req.body
    );
    res.status(201).json(message);
  } catch (error) { next(error); }
};

export const getMessages = async (req, res, next) => {
  try {
    const { limit, before } = req.query;
    const messages = await discussService.getMessages(
      parseInt(req.params.channelId),
      req.user.empId,
      { limit: limit ? parseInt(limit) : 50, before: before ? parseInt(before) : null }
    );
    res.json(messages);
  } catch (error) { next(error); }
};

export const editMessage = async (req, res, next) => {
  try {
    const message = await discussService.editMessage(
      parseInt(req.params.messageId),
      req.user.empId,
      req.body.content
    );
    res.json(message);
  } catch (error) { next(error); }
};

export const deleteMessage = async (req, res, next) => {
  try {
    await discussService.deleteMessage(
      parseInt(req.params.messageId),
      req.user.empId,
      req.user.role
    );
    res.json({ message: "Message deleted" });
  } catch (error) { next(error); }
};

export const getThread = async (req, res, next) => {
  try {
    const replies = await discussService.getThread(parseInt(req.params.messageId));
    res.json(replies);
  } catch (error) { next(error); }
};

/* =====================================================
   MENTION & SEARCH CONTROLLERS
===================================================== */

export const getMyMentions = async (req, res, next) => {
  try {
    const mentions = await discussService.getMyMentions(req.user.empId);
    res.json(mentions);
  } catch (error) { next(error); }
};

export const searchMessages = async (req, res, next) => {
  try {
    const { q } = req.query;
    const results = await discussService.searchMessages(req.user.companyId, req.user.empId, q);
    res.json(results);
  } catch (error) { next(error); }
};

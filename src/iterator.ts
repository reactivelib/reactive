/*
 * Copyright (c) 2018. Christoph Rodak  (https://reactivechart.com)
 */

import {ICancellable} from "./cancellable";
import {IIterator} from "@reactivelib/core";

export interface ICancellableIterator<E> extends ICancellable, IIterator<E> {

}